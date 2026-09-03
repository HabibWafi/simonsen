import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { buildTaggingWhere, filtersFromUrl, getActiveTaggingBatch } from '@/lib/tagging/query'

export async function GET(request: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard

  const batch = await getActiveTaggingBatch()
  if (!batch) return NextResponse.json({ data: [], total: 0, page: 1, pages: 0 })

  const filters = filtersFromUrl(request.nextUrl)
  const warningType = filters.warning
  const assignmentFilters = { ...filters, warning: undefined }
  const where = buildTaggingWhere(Number(batch.id), assignmentFilters, 'a')
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? 1) || 1)
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 25) || 25))
  const offset = (page - 1) * limit
  const warningClause = warningType ? ' AND w.warning_type=?' : ''
  const warningParams = warningType ? [warningType] : []
  const join = `JOIN tagging_assignment a ON a.batch_id=w.batch_id AND (
    w.assignment_id=a.assignment_id OR (
      w.cluster_key IS NOT NULL AND w.cluster_key IN (a.exact_cluster_key, a.near_cluster_key)
    )
  )`

  const [countRows] = await pool.execute(
    `SELECT COUNT(DISTINCT w.id) total FROM tagging_warning w ${join}
     WHERE ${where.sql}${warningClause}`,
    [...where.params, ...warningParams],
  ) as [Array<{ total: number }>, unknown]

  const [rows] = await pool.execute(
    `SELECT DISTINCT w.id, w.warning_type, w.severity, w.assignment_id,
       w.cluster_key, w.related_count, w.distance_m, w.details_json, w.created_at
     FROM tagging_warning w ${join}
     WHERE ${where.sql}${warningClause}
     ORDER BY FIELD(w.severity,'critical','warning','info'), w.related_count DESC, w.id
     LIMIT ${limit} OFFSET ${offset}`,
    [...where.params, ...warningParams],
  )

  const total = Number(countRows[0]?.total ?? 0)
  return NextResponse.json({ data: rows, total, page, pages: Math.ceil(total / limit) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
