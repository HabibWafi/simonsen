import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { buildTaggingWhere, filtersFromUrl, getActiveTaggingBatch } from '@/lib/tagging/query'

export async function GET(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const batch = await getActiveTaggingBatch()
  if (!batch) return NextResponse.json({ batch: null, summary: null }, { headers: { 'Cache-Control': 'no-store' } })
  const batchId = Number(batch.id)
  const where = buildTaggingWhere(batchId, filtersFromUrl(new URL(req.url)))

  const [[totals], [statuses], [kinds]] = await Promise.all([
    pool.execute(
      `SELECT COUNT(*) total,
        SUM(status_conflict=1) status_conflicts,
        SUM(duplicate_occurrences>0) record_duplicates,
        SUM(exact_cluster_size>0) exact_point_duplicates,
        SUM(near_cluster_size>0) near_point_duplicates,
        SUM(has_coordinate=0) missing_coordinates,
        SUM(geotag_accuracy>50) low_accuracy,
        SUM(mapped_code=0) unmapped_codes,
        SUM(inside_subsls=0) outside_subsls,
        SUM(warning_count>0) with_warning,
        AVG(CASE WHEN geotag_accuracy IS NOT NULL THEN geotag_accuracy END) avg_accuracy
       FROM tagging_assignment a WHERE ${where.sql}`, where.params,
    ),
    pool.execute(
      `SELECT status_alias status, COUNT(*) total FROM tagging_assignment a
       WHERE ${where.sql} AND status_conflict=0 GROUP BY status_alias ORDER BY total DESC`, where.params,
    ),
    pool.execute(
      `SELECT
        SUM(ada_keluarga_label IS NOT NULL) keluarga,
        SUM(ada_bang_usaha_label IS NOT NULL) usaha,
        SUM(ada_keluarga_label LIKE '%Baru%') keluarga_baru,
        SUM(ada_bang_usaha_label LIKE '%Baru%') usaha_baru
       FROM tagging_assignment a WHERE ${where.sql}`, where.params,
    ),
  ]) as [
    [Array<Record<string, number | string | null>>, unknown],
    [Array<Record<string, number | string>>, unknown],
    [Array<Record<string, number | string | null>>, unknown],
  ]

  return NextResponse.json({
    batch: {
      id: batch.id, filename: batch.filename, created_at: batch.created_at, completed_at: batch.completed_at,
      raw_rows: batch.raw_rows, unique_assignments: batch.unique_assignments,
    },
    summary: totals[0] ?? {}, statuses, kinds: kinds[0] ?? {},
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
