import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const maxDuration = 60

const columns = [
  'batch_id','source_row','assignment_id','assignment_status_alias','level_6_full_code',
  'nama_usaha_bang','nama_kk','ada_keluarga_label','ada_bang_usaha_label',
  'geotag_accuracy','geotag_latitude','geotag_longitude','row_hash',
]

function nullableText(value: unknown, max: number) {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text.slice(0, max) : null
}

function nullableNumber(value: unknown) {
  if (value == null || String(value).trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function regionCode(value: unknown) {
  if (value == null || String(value).trim() === '') return null
  const number = Number(value)
  if (Number.isSafeInteger(number)) return String(number)
  const text = String(value).trim()
  return /^\d+$/.test(text) ? text : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const user = await requireRole(['admin'])
  if (user instanceof NextResponse) return user
  const { batchId: rawBatchId } = await params
  const batchId = Number(rawBatchId)
  if (!Number.isInteger(batchId) || batchId < 1) return NextResponse.json({ error: 'Batch tidak valid' }, { status: 400 })

  const body = await req.json().catch(() => null) as { rows?: Array<Record<string, unknown>> } | null
  if (!Array.isArray(body?.rows) || body.rows.length < 1 || body.rows.length > 1000) {
    return NextResponse.json({ error: 'Chunk harus berisi 1–1000 baris' }, { status: 400 })
  }
  const [batches] = await pool.execute(
    `SELECT id, status, imported_by FROM tagging_import_batch WHERE id=? LIMIT 1`, [batchId],
  ) as [Array<{ id: number; status: string; imported_by: number }>, unknown]
  const batch = batches[0]
  if (!batch || Number(batch.imported_by) !== Number(user.id) || !['uploading', 'failed'].includes(batch.status)) {
    return NextResponse.json({ error: 'Batch tidak tersedia untuk upload' }, { status: 409 })
  }
  if (batch.status === 'failed') {
    await pool.execute(`UPDATE tagging_import_batch SET status='uploading', error_summary=NULL WHERE id=?`, [batchId])
  }

  const rows = []
  for (const source of body.rows) {
    const sourceRow = Number(source.source_row)
    const assignmentId = nullableText(source.assignment_id, 64)
    const status = nullableText(source.assignment_status_alias, 100)
    const code = regionCode(source.level_6_full_code)
    if (!Number.isInteger(sourceRow) || sourceRow < 2 || !assignmentId || !status || !code) {
      return NextResponse.json({ error: `Data wajib tidak valid pada baris ${sourceRow || '?'}` }, { status: 400 })
    }
    const lat = nullableNumber(source.geotag_latitude)
    const lon = nullableNumber(source.geotag_longitude)
    const normalized = {
      batch_id: batchId,
      source_row: sourceRow,
      assignment_id: assignmentId,
      assignment_status_alias: status,
      level_6_full_code: code,
      nama_usaha_bang: nullableText(source.nama_usaha_bang, 255),
      nama_kk: nullableText(source.nama_kk, 255),
      ada_keluarga_label: nullableText(source.ada_keluarga_label, 80),
      ada_bang_usaha_label: nullableText(source.ada_bang_usaha_label, 80),
      geotag_accuracy: nullableNumber(source.geotag_accuracy),
      geotag_latitude: lat != null && lat >= -90 && lat <= 90 ? lat : null,
      geotag_longitude: lon != null && lon >= -180 && lon <= 180 ? lon : null,
      row_hash: '',
    }
    normalized.row_hash = createHash('sha256').update(JSON.stringify([
      normalized.assignment_id, normalized.assignment_status_alias, normalized.level_6_full_code,
      normalized.nama_usaha_bang, normalized.nama_kk, normalized.ada_keluarga_label,
      normalized.ada_bang_usaha_label, normalized.geotag_accuracy,
      normalized.geotag_latitude, normalized.geotag_longitude,
    ])).digest('hex')
    rows.push(normalized)
  }

  const placeholders = rows.map(() => `(${columns.map(() => '?').join(',')})`).join(',')
  const values = rows.flatMap(row => columns.map(column => row[column as keyof typeof row] ?? null))
  await pool.query(
    `INSERT INTO tagging_import_stage (${columns.join(',')}) VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE
       assignment_id=VALUES(assignment_id), assignment_status_alias=VALUES(assignment_status_alias),
       level_6_full_code=VALUES(level_6_full_code), nama_usaha_bang=VALUES(nama_usaha_bang),
       nama_kk=VALUES(nama_kk), ada_keluarga_label=VALUES(ada_keluarga_label),
       ada_bang_usaha_label=VALUES(ada_bang_usaha_label), geotag_accuracy=VALUES(geotag_accuracy),
       geotag_latitude=VALUES(geotag_latitude), geotag_longitude=VALUES(geotag_longitude),
       row_hash=VALUES(row_hash)`,
    values,
  )
  const [counts] = await pool.execute(
    `SELECT COUNT(*) AS uploaded FROM tagging_import_stage WHERE batch_id=?`, [batchId],
  ) as [Array<{ uploaded: number }>, unknown]
  await pool.execute(`UPDATE tagging_import_batch SET uploaded_rows=? WHERE id=?`, [Number(counts[0].uploaded), batchId])
  return NextResponse.json({ ok: true, uploadedRows: Number(counts[0].uploaded) })
}
