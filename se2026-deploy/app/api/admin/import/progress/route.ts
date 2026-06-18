import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { parseProgressBuffer } from '@/lib/excel/parseProgress'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = parseProgressBuffer(buffer)

  if (parsed.missingColumns.length) {
    return NextResponse.json({
      error: 'Kolom wajib tidak ditemukan',
      missingColumns: parsed.missingColumns,
    }, { status: 400 })
  }

  // Pre-resolve petugas NIP → id (cache)
  const petugasNips = Array.from(new Set(parsed.rows.map(r => r.petugas_nip).filter(Boolean)))
  const petugasMap = new Map<string, number>()
  if (petugasNips.length) {
    const ph = petugasNips.map(() => '?').join(',')
    const [pus] = await pool.execute(
      `SELECT id, nip FROM users WHERE nip IN (${ph})`,
      petugasNips,
    ) as [any[], any]
    for (const u of pus) petugasMap.set(u.nip, u.id)
  }

  // Pre-fetch "before" snapshot
  const allIdsbrs = parsed.rows.map(r => r.idsbr)
  const beforeMap = new Map<string, any>()
  for (let i = 0; i < allIdsbrs.length; i += 800) {
    const chunk = allIdsbrs.slice(i, i + 800)
    if (chunk.length === 0) continue
    try {
      const [rows] = await pool.query(
        `SELECT idsbr, status_pencacahan, lat, lng, tanggal_cacah, catatan, petugas_id
         FROM usaha WHERE idsbr IN (${chunk.map(() => '?').join(',')})`,
        chunk,
      ) as [any[], any]
      for (const r of rows) beforeMap.set(r.idsbr, r)
    } catch { /* ignore */ }
  }

  // Buat batch dulu
  const [batchResult] = await pool.execute(
    `INSERT INTO import_batch (jenis, filename, total_rows, inserted_rows, updated_rows, duplicate_rows, error_rows, error_summary, imported_by, sensus_kode, tahun)
     VALUES ('progress_fasih', ?, 0, 0, 0, 0, 0, '[]', ?, 'se', 2026)`,
    [file.name, Number(guard.id)],
  ) as [any, any]
  const batchId = batchResult.insertId

  let updated = 0
  let errorRows = parsed.errors.length
  const snapshots: Array<{ idsbr: string; action: 'update'|'error'; before: any; after: any; rowIndex: number; errorMessage?: string }> = []

  for (const r of parsed.rows) {
    try {
      const before = beforeMap.get(r.idsbr)
      if (!before) {
        errorRows++
        parsed.errors.push({ rowIndex: r.rowIndex, idsbr: r.idsbr, message: 'IDSBR tidak ditemukan di master usaha' })
        snapshots.push({ idsbr: r.idsbr, action: 'error', before: null, after: null, rowIndex: r.rowIndex, errorMessage: 'IDSBR tidak ditemukan' })
        continue
      }

      const petugasId = r.petugas_nip ? petugasMap.get(r.petugas_nip) ?? null : null
      const [result] = await pool.execute(
        `UPDATE usaha
         SET status_pencacahan = ?,
             lat = COALESCE(?, lat),
             lng = COALESCE(?, lng),
             tanggal_cacah = COALESCE(?, tanggal_cacah),
             catatan = COALESCE(?, catatan),
             petugas_id = COALESCE(?, petugas_id)
         WHERE idsbr = ?`,
        [r.status, r.lat, r.lng, r.tanggal_cacah, r.catatan, petugasId, r.idsbr],
      ) as [any, any]
      if (result.affectedRows > 0) {
        updated++
        const after = {
          idsbr: r.idsbr,
          status_pencacahan: r.status,
          lat: r.lat ?? before.lat,
          lng: r.lng ?? before.lng,
          tanggal_cacah: r.tanggal_cacah ?? before.tanggal_cacah,
          catatan: r.catatan ?? before.catatan,
          petugas_id: petugasId ?? before.petugas_id,
        }
        snapshots.push({ idsbr: r.idsbr, action: 'update', before, after, rowIndex: r.rowIndex })
      } else {
        errorRows++
        parsed.errors.push({ rowIndex: r.rowIndex, idsbr: r.idsbr, message: 'Update affected 0 rows' })
        snapshots.push({ idsbr: r.idsbr, action: 'error', before, after: null, rowIndex: r.rowIndex, errorMessage: 'Update 0 rows' })
      }
    } catch (e: any) {
      errorRows++
      parsed.errors.push({ rowIndex: r.rowIndex, idsbr: r.idsbr, message: e.message })
      snapshots.push({ idsbr: r.idsbr, action: 'error', before: null, after: null, rowIndex: r.rowIndex, errorMessage: e.message })
    }
  }

  // Tulis import_batch_row
  const SNAP_BATCH = 200
  for (let i = 0; i < snapshots.length; i += SNAP_BATCH) {
    const chunk = snapshots.slice(i, i + SNAP_BATCH)
    const ph = chunk.map(() => '(?,?,?,?,?,?,?)').join(',')
    const vals: any[] = []
    for (const s of chunk) {
      vals.push(
        batchId, s.idsbr, s.action,
        s.before ? JSON.stringify(s.before) : null,
        s.after  ? JSON.stringify(s.after)  : null,
        s.errorMessage ?? null,
        s.rowIndex,
      )
    }
    try {
      await pool.query(
        `INSERT INTO import_batch_row (batch_id, idsbr, action, before_json, after_json, error_message, row_index) VALUES ${ph}`,
        vals,
      )
    } catch { /* ignore */ }
  }

  const total = parsed.rows.length + parsed.errors.length
  await pool.execute(
    `UPDATE import_batch SET total_rows = ?, updated_rows = ?, error_rows = ?, error_summary = ? WHERE id = ?`,
    [total, updated, errorRows, JSON.stringify(parsed.errors.slice(0, 50)), batchId],
  )

  return NextResponse.json({
    total,
    inserted: 0,
    updated,
    duplicate: 0,
    error: errorRows,
    errors: parsed.errors.slice(0, 50),
    batchId,
  })
}
