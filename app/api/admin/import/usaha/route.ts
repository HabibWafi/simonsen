import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { parseUsahaBuffer } from '@/lib/excel/parseUsaha'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = parseUsahaBuffer(buffer)

  if (parsed.missingColumns.length) {
    return NextResponse.json({
      error: 'Kolom wajib tidak ditemukan',
      missingColumns: parsed.missingColumns,
    }, { status: 400 })
  }

  // 1. Buat batch dulu (status: pending → kita pakai completed setelah selesai)
  const [batchResult] = await pool.execute(
    `INSERT INTO import_batch (jenis, filename, total_rows, inserted_rows, updated_rows, duplicate_rows, error_rows, error_summary, imported_by, sensus_kode, tahun)
     VALUES ('master_usaha', ?, 0, 0, 0, 0, 0, '[]', ?, 'se', 2026)`,
    [file.name, Number(guard.id)],
  ) as [any, any]
  const batchId = batchResult.insertId

  // 2. Lookup before snapshot — SELECT semua IDSBR yang sudah ada
  const allIdsbrs = parsed.rows.map(r => r.idsbr)
  const beforeMap = new Map<string, any>()
  if (allIdsbrs.length > 0) {
    // chunk SELECT (mysql max placeholders sekitar 1000)
    for (let i = 0; i < allIdsbrs.length; i += 800) {
      const chunk = allIdsbrs.slice(i, i + 800)
      try {
        const [rows] = await pool.query(
          `SELECT * FROM usaha WHERE idsbr IN (${chunk.map(() => '?').join(',')})`,
          chunk,
        ) as [any[], any]
        for (const r of rows) beforeMap.set(r.idsbr, r)
      } catch { /* ignore */ }
    }
  }

  // 3. Bulk UPSERT
  const BATCH = 500
  let inserted = 0
  let duplicate = 0
  let errorRows = parsed.errors.length
  const rowSnapshots: Array<{ idsbr: string; action: 'insert'|'duplicate'; before: any; after: any; rowIndex: number }> = []

  for (let i = 0; i < parsed.rows.length; i += BATCH) {
    const chunk = parsed.rows.slice(i, i + BATCH)
    const placeholders = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')
    const values: any[] = []
    for (const r of chunk) {
      values.push(
        r.idsbr, r.nama, r.alamat, r.kdprov, r.kdkab, r.kdkec, r.kddesa, r.kdsls,
        r.nmprov, r.nmkab, r.nmkec, r.nmdesa, r.nmsls, r.skala_usaha, new Date(),
      )
    }
    try {
      await pool.query(
        `INSERT INTO usaha
         (idsbr, nama, alamat, kdprov, kdkab, kdkec, kddesa, kdsls, nmprov, nmkab, nmkec, nmdesa, nmsls, skala_usaha, imported_at)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE
           nama=VALUES(nama), alamat=VALUES(alamat), kdprov=VALUES(kdprov), kdkab=VALUES(kdkab),
           kdkec=VALUES(kdkec), kddesa=VALUES(kddesa), kdsls=VALUES(kdsls),
           nmprov=VALUES(nmprov), nmkab=VALUES(nmkab), nmkec=VALUES(nmkec),
           nmdesa=VALUES(nmdesa), nmsls=VALUES(nmsls), skala_usaha=VALUES(skala_usaha)`,
        values,
      )

      // Tally insert vs duplicate berdasar beforeMap
      for (const r of chunk) {
        const before = beforeMap.get(r.idsbr)
        const after = { idsbr: r.idsbr, nama: r.nama, alamat: r.alamat, kdprov: r.kdprov, kdkab: r.kdkab, kdkec: r.kdkec, kddesa: r.kddesa, kdsls: r.kdsls, nmprov: r.nmprov, nmkab: r.nmkab, nmkec: r.nmkec, nmdesa: r.nmdesa, nmsls: r.nmsls, skala_usaha: r.skala_usaha }
        if (before) {
          duplicate++
          rowSnapshots.push({ idsbr: r.idsbr, action: 'duplicate', before, after, rowIndex: (r as any).rowIndex ?? -1 })
        } else {
          inserted++
          rowSnapshots.push({ idsbr: r.idsbr, action: 'insert', before: null, after, rowIndex: (r as any).rowIndex ?? -1 })
        }
      }
    } catch (e: any) {
      errorRows += chunk.length
      parsed.errors.push({ rowIndex: -1, message: `Batch ${i}: ${e.message}` })
    }
  }

  // 4. Tulis import_batch_row (snapshot — best effort, ignore kalau gagal)
  const SNAP_BATCH = 200
  for (let i = 0; i < rowSnapshots.length; i += SNAP_BATCH) {
    const chunk = rowSnapshots.slice(i, i + SNAP_BATCH)
    const ph = chunk.map(() => '(?,?,?,?,?,?)').join(',')
    const vals: any[] = []
    for (const s of chunk) {
      vals.push(batchId, s.idsbr, s.action, JSON.stringify(s.before), JSON.stringify(s.after), s.rowIndex)
    }
    try {
      await pool.query(
        `INSERT INTO import_batch_row (batch_id, idsbr, action, before_json, after_json, row_index) VALUES ${ph}`,
        vals,
      )
    } catch { /* ignore — kalau tabel belum di-migrate, lanjut */ }
  }
  // Insert error rows
  for (const er of parsed.errors) {
    try {
      await pool.execute(
        `INSERT INTO import_batch_row (batch_id, idsbr, action, error_message, row_index) VALUES (?, ?, 'error', ?, ?)`,
        [batchId, (er as any).idsbr ?? '', er.message, er.rowIndex ?? -1],
      )
    } catch { /* ignore */ }
  }

  // 5. Update batch summary
  const total = parsed.rows.length + parsed.errors.length
  await pool.execute(
    `UPDATE import_batch SET total_rows = ?, inserted_rows = ?, duplicate_rows = ?, error_rows = ?, error_summary = ? WHERE id = ?`,
    [total, inserted, duplicate, errorRows, JSON.stringify(parsed.errors.slice(0, 50)), batchId],
  )

  return NextResponse.json({
    total,
    inserted,
    duplicate,
    updated: 0,
    error: errorRows,
    errors: parsed.errors.slice(0, 50),
    batchId,
  })
}
