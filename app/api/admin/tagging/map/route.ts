import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { buildTaggingWhere, filtersFromUrl, getActiveTaggingBatch } from '@/lib/tagging/query'
import { getTaggingRegionContext } from '@/lib/tagging/geo'

const MAP_CACHE = { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' }

export async function GET(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const batch = await getActiveTaggingBatch()
  if (!batch) return NextResponse.json({ mode: 'empty', data: [] })
  const url = new URL(req.url)
  const filters = filtersFromUrl(url)
  const zoom = Math.min(19, Math.max(8, Number(url.searchParams.get('zoom')) || 11))
  const where = buildTaggingWhere(Number(batch.id), filters)
  const region = getTaggingRegionContext(filters)
  const contextGeojson = region.regionKey
    ? { type: 'FeatureCollection' as const, features: region.features }
    : undefined
  const context = { viewport: region.viewport, contextGeojson }

  if (zoom <= 12 && !filters.idsubsls) {
    const [rows] = await pool.execute(
      `SELECT idsubsls, COUNT(*) total, SUM(warning_count>0) warnings,
        SUM(status_conflict=1) conflicts, SUM(status_alias LIKE 'APPROVED%') approved
       FROM tagging_assignment a WHERE ${where.sql} GROUP BY idsubsls`, where.params,
    ) as [Array<Record<string, string | number>>, unknown]
    const metrics = new Map(rows.map(row => [String(row.idsubsls), row]))
    const features = region.features
      .map(feature => {
        const id = String(feature.properties?.idsubsls ?? '')
        return { ...feature, properties: { ...feature.properties, ...(metrics.get(id) ?? { total: 0, warnings: 0, conflicts: 0, approved: 0 }) } }
      })
    return NextResponse.json({ mode: 'polygons', geojson: { type: 'FeatureCollection', features }, viewport: region.viewport }, { headers: MAP_CACHE })
  }

  const narrowScope = Boolean(filters.kddesa || filters.idsls || filters.idsubsls)
  if (zoom <= 15 || (!narrowScope && zoom < 17)) {
    const decimals = zoom <= 13 ? 2 : 3
    const [rows] = await pool.execute(
      `SELECT ROUND(geotag_latitude, ${decimals}) latitude, ROUND(geotag_longitude, ${decimals}) longitude,
        COUNT(*) total, SUM(warning_count>0) warnings, SUM(exact_cluster_size>0) exact_duplicates
       FROM tagging_assignment a WHERE ${where.sql} AND has_coordinate=1
       GROUP BY ROUND(geotag_latitude, ${decimals}), ROUND(geotag_longitude, ${decimals})
       ORDER BY total DESC LIMIT 1601`, where.params,
    )
    const data = rows as Array<Record<string, unknown>>
    return NextResponse.json({ mode: 'clusters', data: data.slice(0, 1600), truncated: data.length > 1600, ...context }, { headers: MAP_CACHE })
  }

  const [rows] = await pool.execute(
    `SELECT assignment_id, status_alias, geotag_latitude latitude, geotag_longitude longitude,
      geotag_accuracy accuracy, warning_count, exact_cluster_size, near_cluster_size,
      level_6_full_code, nmkec, nmdesa, nmsls
     FROM tagging_assignment a WHERE ${where.sql} AND has_coordinate=1
     ORDER BY warning_count DESC, assignment_id LIMIT 2001`, where.params,
  )
  const data = rows as Array<Record<string, unknown>>
  return NextResponse.json({ mode: 'points', data: data.slice(0, 2000), truncated: data.length > 2000, ...context }, { headers: MAP_CACHE })
}
