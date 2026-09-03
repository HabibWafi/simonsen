import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GEO_PATH = resolve(process.cwd(), 'public/geo/musirawas_sls-subsls.geojson')
let geoIndexCache = null

function md5(value) {
  return createHash('md5').update(value).digest('hex')
}

function asText(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function getGeoIndex() {
  if (geoIndexCache) return geoIndexCache
  const collection = JSON.parse(readFileSync(GEO_PATH, 'utf8'))
  const byId = new Map()
  for (const feature of collection.features ?? []) {
    const key = String(feature?.properties?.idsubsls ?? '').trim()
    if (key) byId.set(key, feature)
  }
  geoIndexCache = { collection, byId }
  return geoIndexCache
}

function pointOnSegment(point, a, b) {
  const [x, y] = point
  const cross = (y - a[1]) * (b[0] - a[0]) - (x - a[0]) * (b[1] - a[1])
  if (Math.abs(cross) > 1e-10) return false
  const dot = (x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])
  if (dot < 0) return false
  const lenSq = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2
  return dot <= lenSq
}

function pointInRing(point, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j]
    const b = ring[i]
    if (pointOnSegment(point, a, b)) return true
    const intersects = ((b[1] > point[1]) !== (a[1] > point[1]))
      && point[0] < ((a[0] - b[0]) * (point[1] - b[1])) / (a[1] - b[1]) + b[0]
    if (intersects) inside = !inside
  }
  return inside
}

function pointInPolygon(point, rings) {
  if (!rings?.length || !pointInRing(point, rings[0])) return false
  for (let i = 1; i < rings.length; i++) if (pointInRing(point, rings[i])) return false
  return true
}

function pointInGeometry(point, geometry) {
  if (!geometry) return false
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates)
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(polygon => pointInPolygon(point, polygon))
  }
  return false
}

function haversineMeters(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const lat1 = a.lat * rad
  const lat2 = b.lat * rad
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i)
    this.rank = new Uint8Array(size)
  }
  find(x) {
    let root = x
    while (this.parent[root] !== root) root = this.parent[root]
    while (this.parent[x] !== x) {
      const next = this.parent[x]
      this.parent[x] = root
      x = next
    }
    return root
  }
  union(a, b) {
    let ra = this.find(a)
    let rb = this.find(b)
    if (ra === rb) return
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra]
    this.parent[rb] = ra
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++
  }
}

async function insertRows(conn, table, columns, rows, chunkSize = 250) {
  if (!rows.length) return
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(',')})`).join(',')
    const values = chunk.flatMap(row => columns.map(column => row[column] ?? null))
    await conn.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`, values)
  }
}

function addWarning(warnings, assignment, warning) {
  assignment.warning_count++
  warnings.push({
    batch_id: assignment.batch_id,
    warning_type: warning.warning_type,
    severity: warning.severity,
    assignment_id: assignment.assignment_id,
    cluster_key: warning.cluster_key ?? null,
    related_count: warning.related_count ?? 1,
    distance_m: warning.distance_m ?? null,
    details_json: warning.details ? JSON.stringify(warning.details) : null,
  })
}

export async function finalizeTaggingBatch(pool, batchId) {
  const [batchRows] = await pool.execute(
    `SELECT * FROM tagging_import_batch WHERE id = ? LIMIT 1`,
    [batchId],
  )
  const batch = batchRows[0]
  if (!batch) throw new Error('Batch tagging tidak ditemukan')
  if (!['uploading', 'failed'].includes(batch.status)) {
    if (batch.status === 'completed') return { alreadyCompleted: true, batchId }
    throw new Error(`Batch tidak dapat difinalisasi dari status ${batch.status}`)
  }

  await pool.execute(
    `UPDATE tagging_import_batch SET status='processing', error_summary=NULL WHERE id=?`,
    [batchId],
  )

  try {
    const [stageRows] = await pool.execute(
      `SELECT * FROM tagging_import_stage WHERE batch_id = ? ORDER BY source_row ASC`,
      [batchId],
    )
    if (Number(batch.raw_rows) !== stageRows.length) {
      throw new Error(`Upload belum lengkap: ${stageRows.length}/${batch.raw_rows} baris`)
    }

    const geo = getGeoIndex()
    const grouped = new Map()
    for (const row of stageRows) {
      const id = String(row.assignment_id).trim()
      let group = grouped.get(id)
      if (!group) {
        group = { rows: [], statuses: new Set(), hashes: new Set() }
        grouped.set(id, group)
      }
      group.rows.push(row)
      group.statuses.add(String(row.assignment_status_alias).trim())
      group.hashes.add(String(row.row_hash))
    }

    const assignments = []
    const warnings = []
    for (const [assignmentId, group] of grouped) {
      const canonical = group.rows[group.rows.length - 1]
      const statuses = [...group.statuses]
      const code = String(canonical.level_6_full_code ?? '').trim()
      const lat = asNumber(canonical.geotag_latitude)
      const lon = asNumber(canonical.geotag_longitude)
      const hasCoordinate = lat != null && lon != null
        && lat !== 0 && lon !== 0
        && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
      const feature = geo.byId.get(code)
      const props = feature?.properties ?? {}
      const statusConflict = statuses.length > 1
      const assignment = {
        batch_id: Number(batchId),
        assignment_id: assignmentId,
        status_alias: statusConflict ? 'CONFLICT' : statuses[0],
        status_conflict: statusConflict ? 1 : 0,
        status_variants_json: JSON.stringify(statuses),
        source_rows_json: JSON.stringify(group.rows.map(row => Number(row.source_row))),
        duplicate_occurrences: Math.max(0, group.rows.length - 1),
        level_6_full_code: code,
        kdprov: code.length >= 2 ? code.slice(0, 2) : null,
        kdkab: code.length >= 4 ? code.slice(0, 4) : null,
        kdkec: code.length >= 7 ? code.slice(0, 7) : null,
        kddesa: code.length >= 10 ? code.slice(0, 10) : null,
        idsls: code.length >= 14 ? code.slice(0, 14) : null,
        idsubsls: code.length >= 16 ? code.slice(0, 16) : null,
        nmkec: asText(props.nmkec),
        nmdesa: asText(props.nmdesa),
        nmsls: asText(props.nmsls),
        nama_usaha_bang: asText(canonical.nama_usaha_bang),
        nama_kk: asText(canonical.nama_kk),
        ada_keluarga_label: asText(canonical.ada_keluarga_label),
        ada_bang_usaha_label: asText(canonical.ada_bang_usaha_label),
        geotag_accuracy: asNumber(canonical.geotag_accuracy),
        geotag_latitude: hasCoordinate ? lat : null,
        geotag_longitude: hasCoordinate ? lon : null,
        has_coordinate: hasCoordinate ? 1 : 0,
        mapped_code: feature ? 1 : 0,
        inside_subsls: feature && hasCoordinate
          ? (pointInGeometry([lon, lat], feature.geometry) ? 1 : 0)
          : null,
        exact_cluster_key: null,
        exact_cluster_size: 0,
        near_cluster_key: null,
        near_cluster_size: 0,
        warning_count: 0,
      }

      if (assignment.duplicate_occurrences > 0) addWarning(warnings, assignment, {
        warning_type: 'record_duplicate', severity: 'warning',
        related_count: group.rows.length,
        details: { source_rows: group.rows.map(row => Number(row.source_row)), distinct_rows: group.hashes.size },
      })
      if (statusConflict) addWarning(warnings, assignment, {
        warning_type: 'status_conflict', severity: 'critical',
        related_count: statuses.length,
        details: { statuses, source_rows: group.rows.map(row => Number(row.source_row)) },
      })
      if (!hasCoordinate) addWarning(warnings, assignment, {
        warning_type: 'missing_coordinate', severity: 'critical',
      })
      if (assignment.geotag_accuracy != null && assignment.geotag_accuracy > 50) {
        addWarning(warnings, assignment, {
          warning_type: 'low_accuracy', severity: assignment.geotag_accuracy > 100 ? 'critical' : 'warning',
          details: { accuracy_m: assignment.geotag_accuracy },
        })
      }
      if (!feature) addWarning(warnings, assignment, {
        warning_type: 'unmapped_code', severity: 'critical', details: { level_6_full_code: code },
      })
      if (assignment.inside_subsls === 0) addWarning(warnings, assignment, {
        warning_type: 'outside_subsls', severity: 'critical', details: { level_6_full_code: code },
      })
      assignments.push(assignment)
    }

    const coordinateGroups = new Map()
    for (const assignment of assignments) {
      if (!assignment.has_coordinate) continue
      // Nilai stage disimpan pada presisi DECIMAL(11,8); jangan bulatkan lagi karena
      // koordinat yang hanya berdekatan harus masuk warning near, bukan exact.
      const key = `${Number(assignment.geotag_latitude)}|${Number(assignment.geotag_longitude)}`
      if (!coordinateGroups.has(key)) coordinateGroups.set(key, [])
      coordinateGroups.get(key).push(assignment)
    }

    let exactPointGroups = 0
    for (const [coordinate, members] of coordinateGroups) {
      if (members.length < 2) continue
      exactPointGroups++
      const clusterKey = md5(`exact:${coordinate}`)
      for (const member of members) {
        member.exact_cluster_key = clusterKey
        member.exact_cluster_size = members.length
        member.warning_count++
      }
      const [lat, lon] = coordinate.split('|').map(Number)
      warnings.push({
        batch_id: Number(batchId), warning_type: 'exact_point_duplicate', severity: 'critical',
        assignment_id: null, cluster_key: clusterKey, related_count: members.length, distance_m: 0,
        details_json: JSON.stringify({ latitude: lat, longitude: lon, assignment_ids: members.map(m => m.assignment_id) }),
      })
    }

    const nodes = [...coordinateGroups.entries()].map(([key, members]) => ({
      key,
      members,
      lat: Number(members[0].geotag_latitude),
      lon: Number(members[0].geotag_longitude),
    }))
    const uf = new UnionFind(nodes.length)
    const buckets = new Map()
    const cellSize = 10
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const x = node.lon * 111320 * Math.cos(node.lat * Math.PI / 180)
      const y = node.lat * 111320
      const cx = Math.floor(x / cellSize)
      const cy = Math.floor(y / cellSize)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const candidates = buckets.get(`${cx + dx}|${cy + dy}`) ?? []
          for (const j of candidates) {
            const distance = haversineMeters(node, nodes[j])
            if (distance > 0.05 && distance <= 10) uf.union(i, j)
          }
        }
      }
      const bucketKey = `${cx}|${cy}`
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, [])
      buckets.get(bucketKey).push(i)
    }

    const nearGroups = new Map()
    for (let i = 0; i < nodes.length; i++) {
      const root = uf.find(i)
      if (!nearGroups.has(root)) nearGroups.set(root, [])
      nearGroups.get(root).push(nodes[i])
    }
    let nearPointGroups = 0
    for (const groupNodes of nearGroups.values()) {
      if (groupNodes.length < 2) continue
      nearPointGroups++
      const members = groupNodes.flatMap(node => node.members)
      const clusterKey = md5(`near:${groupNodes.map(node => node.key).sort().join(';')}`)
      for (const member of members) {
        member.near_cluster_key = clusterKey
        member.near_cluster_size = members.length
        member.warning_count++
      }
      warnings.push({
        batch_id: Number(batchId), warning_type: 'near_point_duplicate', severity: 'warning',
        assignment_id: null, cluster_key: clusterKey, related_count: members.length, distance_m: 10,
        details_json: JSON.stringify({
          coordinate_count: groupNodes.length,
          assignment_ids: members.slice(0, 200).map(m => m.assignment_id),
          truncated: members.length > 200,
        }),
      })
    }

    const assignmentColumns = [
      'batch_id','assignment_id','status_alias','status_conflict','status_variants_json','source_rows_json',
      'duplicate_occurrences','level_6_full_code','kdprov','kdkab','kdkec','kddesa','idsls','idsubsls',
      'nmkec','nmdesa','nmsls','nama_usaha_bang','nama_kk','ada_keluarga_label','ada_bang_usaha_label',
      'geotag_accuracy','geotag_latitude','geotag_longitude','has_coordinate','mapped_code','inside_subsls',
      'exact_cluster_key','exact_cluster_size','near_cluster_key','near_cluster_size','warning_count',
    ]
    const warningColumns = [
      'batch_id','warning_type','severity','assignment_id','cluster_key','related_count','distance_m','details_json',
    ]
    const stats = {
      rawRows: stageRows.length,
      uniqueAssignments: assignments.length,
      duplicateRows: stageRows.length - assignments.length,
      statusConflicts: assignments.filter(a => a.status_conflict).length,
      exactPointGroups,
      nearPointGroups,
      missingCoordinates: assignments.filter(a => !a.has_coordinate).length,
      lowAccuracy: assignments.filter(a => a.geotag_accuracy != null && a.geotag_accuracy > 50).length,
      unmappedCodes: assignments.filter(a => !a.mapped_code).length,
      outsideSubsls: assignments.filter(a => a.inside_subsls === 0).length,
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.execute(`DELETE FROM tagging_warning WHERE batch_id=?`, [batchId])
      await conn.execute(`DELETE FROM tagging_assignment WHERE batch_id=?`, [batchId])
      await insertRows(conn, 'tagging_assignment', assignmentColumns, assignments, 180)
      await insertRows(conn, 'tagging_warning', warningColumns, warnings, 300)
      await conn.execute(`UPDATE tagging_import_batch SET is_active=0 WHERE is_active=1`)
      await conn.execute(
        `UPDATE tagging_import_batch SET status='completed', is_active=1, uploaded_rows=?,
          unique_assignments=?, duplicate_rows=?, status_conflicts=?, exact_point_groups=?, near_point_groups=?,
          missing_coordinates=?, low_accuracy=?, unmapped_codes=?, outside_subsls=?, completed_at=CURRENT_TIMESTAMP(3)
         WHERE id=?`,
        [stats.rawRows, stats.uniqueAssignments, stats.duplicateRows, stats.statusConflicts,
          stats.exactPointGroups, stats.nearPointGroups, stats.missingCoordinates, stats.lowAccuracy,
          stats.unmappedCodes, stats.outsideSubsls, batchId],
      )
      await conn.execute(`DELETE FROM tagging_import_stage WHERE batch_id=?`, [batchId])
      await conn.commit()
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }

    return { batchId: Number(batchId), ...stats }
  } catch (error) {
    await pool.execute(
      `UPDATE tagging_import_batch SET status='failed', error_summary=? WHERE id=?`,
      [String(error?.message ?? error).slice(0, 2000), batchId],
    )
    throw error
  }
}

export function resetTaggingGeoCache() {
  geoIndexCache = null
}
