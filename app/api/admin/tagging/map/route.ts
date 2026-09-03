import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { buildTaggingWhere, filtersFromUrl, getActiveTaggingBatch } from '@/lib/tagging/query'
import { getTaggingGeoCollection, safeTaggingFeature } from '@/lib/tagging/geo'

export async function GET(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const batch = await getActiveTaggingBatch()
  if (!batch) return NextResponse.json({ mode: 'empty', data: [] })
  const url = new URL(req.url)
  const filters = filtersFromUrl(url)
  const zoom = Math.min(19, Math.max(8, Number(url.searchParams.get('zoom')) || 11))
  const where = buildTaggingWhere(Number(batch.id), filters)

  if (zoom <= 12 && !filters.idsubsls) {
    const [rows] = await pool.execute(
      `SELECT idsubsls, COUNT(*) total, SUM(warning_count>0) warnings,
        SUM(status_conflict=1) conflicts, SUM(status_alias LIKE 'APPROVED%') approved
       FROM tagging_assignment a WHERE ${where.sql} GROUP BY idsubsls`, where.params,
    ) as [Array<Record<string, string | number>>, unknown]
    const metrics = new Map(rows.map(row => [String(row.idsubsls), row]))
    const features = getTaggingGeoCollection().features
      .filter(feature => {
        const id = String(feature.properties?.idsubsls ?? '')
        if (filters.kdkec && !id.startsWith(filters.kdkec)) return false
        if (filters.kddesa && !id.startsWith(filters.kddesa)) return false
        if (filters.idsls && !id.startsWith(filters.idsls)) return false
        return !filters.idsubsls || id === filters.idsubsls
      })
      .map(feature => {
        const safe = safeTaggingFeature(feature)
        const id = String(safe.properties?.idsubsls ?? '')
        return { ...safe, properties: { ...safe.properties, ...(metrics.get(id) ?? { total: 0, warnings: 0, conflicts: 0, approved: 0 }) } }
      })
    return NextResponse.json({ mode: 'polygons', geojson: { type: 'FeatureCollection', features } }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  if (zoom <= 14) {
    const decimals = zoom >= 14 ? 4 : 3
    const [rows] = await pool.execute(
      `SELECT ROUND(geotag_latitude, ${decimals}) latitude, ROUND(geotag_longitude, ${decimals}) longitude,
        COUNT(*) total, SUM(warning_count>0) warnings, SUM(exact_cluster_size>0) exact_duplicates
       FROM tagging_assignment a WHERE ${where.sql} AND has_coordinate=1
       GROUP BY ROUND(geotag_latitude, ${decimals}), ROUND(geotag_longitude, ${decimals})
       ORDER BY total DESC LIMIT 4000`, where.params,
    )
    return NextResponse.json({ mode: 'clusters', data: rows }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  const [rows] = await pool.execute(
    `SELECT assignment_id, status_alias, geotag_latitude latitude, geotag_longitude longitude,
      geotag_accuracy accuracy, warning_count, exact_cluster_size, near_cluster_size,
      level_6_full_code, nmkec, nmdesa, nmsls
     FROM tagging_assignment a WHERE ${where.sql} AND has_coordinate=1
     ORDER BY warning_count DESC, assignment_id LIMIT 5000`, where.params,
  )
  return NextResponse.json({ mode: 'points', data: rows, truncated: (rows as unknown[]).length === 5000 }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
