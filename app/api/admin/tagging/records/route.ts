import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { buildTaggingWhere, filtersFromUrl, getActiveTaggingBatch } from '@/lib/tagging/query'

export async function GET(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const batch = await getActiveTaggingBatch()
  if (!batch) return NextResponse.json({ data: [], total: 0, page: 1, pages: 0 })
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get('limit')) || 25))
  const where = buildTaggingWhere(Number(batch.id), filtersFromUrl(url))
  const offset = (page - 1) * limit
  const [rowsResult, countResult] = await Promise.all([
    pool.execute(
      `SELECT assignment_id, status_alias, level_6_full_code, kdkec, kddesa, idsls, idsubsls,
        nmkec, nmdesa, nmsls, ada_keluarga_label, ada_bang_usaha_label,
        geotag_accuracy, geotag_latitude, geotag_longitude, duplicate_occurrences,
       status_conflict, exact_cluster_size, near_cluster_size, has_coordinate, mapped_code,
       inside_subsls, warning_count
       FROM tagging_assignment a WHERE ${where.sql}
       ORDER BY warning_count DESC, assignment_id ASC LIMIT ${limit} OFFSET ${offset}`, where.params,
    ),
    pool.execute(`SELECT COUNT(*) total FROM tagging_assignment a WHERE ${where.sql}`, where.params),
  ])
  const rows = rowsResult[0] as Array<Record<string, unknown>>
  const counts = countResult[0] as Array<{ total: number }>
  return NextResponse.json({ data: rows, total: Number(counts[0]?.total ?? 0), page, pages: Math.ceil(Number(counts[0]?.total ?? 0) / limit) }, {
    headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=60' },
  })
}
