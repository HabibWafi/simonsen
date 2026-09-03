import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { getActiveTaggingBatch } from '@/lib/tagging/query'

function jsonValue(value: unknown) {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

export async function GET(_req: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const batch = await getActiveTaggingBatch()
  if (!batch) return NextResponse.json({ error: 'Belum ada snapshot aktif' }, { status: 404 })
  const { assignmentId } = await params
  const [rows] = await pool.execute(
    `SELECT * FROM tagging_assignment WHERE batch_id=? AND assignment_id=? LIMIT 1`,
    [Number(batch.id), assignmentId],
  ) as [Array<Record<string, unknown>>, unknown]
  const record = rows[0]
  if (!record) return NextResponse.json({ error: 'Assignment tidak ditemukan' }, { status: 404 })
  const [warningRows] = await pool.execute(
    `SELECT warning_type, severity, related_count, distance_m, details_json
     FROM tagging_warning WHERE batch_id=? AND (
       assignment_id=? OR cluster_key IN (?, ?)
     ) ORDER BY FIELD(severity,'critical','warning','info'), warning_type`,
    [Number(batch.id), assignmentId, String(record.exact_cluster_key ?? ''), String(record.near_cluster_key ?? '')],
  ) as [Array<Record<string, unknown>>, unknown]
  record.status_variants_json = jsonValue(record.status_variants_json)
  record.source_rows_json = jsonValue(record.source_rows_json)
  for (const warning of warningRows) warning.details_json = jsonValue(warning.details_json)
  return NextResponse.json({ data: record, warnings: warningRows }, { headers: { 'Cache-Control': 'private, no-store' } })
}
