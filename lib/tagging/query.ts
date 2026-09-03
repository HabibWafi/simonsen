import pool from '@/lib/db'

export type TaggingFilters = {
  kdkec?: string
  kddesa?: string
  idsls?: string
  idsubsls?: string
  status?: string
  warning?: string
  kind?: 'keluarga' | 'usaha'
  accuracy?: 'good' | 'low' | 'missing'
  search?: string
}

export function filtersFromUrl(url: URL): TaggingFilters {
  const value = (key: string) => url.searchParams.get(key)?.trim() || undefined
  const kind = value('kind')
  const accuracy = value('accuracy')
  return {
    kdkec: value('kdkec'), kddesa: value('kddesa'), idsls: value('idsls'), idsubsls: value('idsubsls'),
    status: value('status'), warning: value('warning'), search: value('search'),
    kind: kind === 'keluarga' || kind === 'usaha' ? kind : undefined,
    accuracy: accuracy === 'good' || accuracy === 'low' || accuracy === 'missing' ? accuracy : undefined,
  }
}

export async function getActiveTaggingBatch() {
  const [rows] = await pool.execute(
    `SELECT * FROM tagging_import_batch WHERE is_active=1 AND status='completed' ORDER BY id DESC LIMIT 1`,
  ) as [Record<string, unknown>[], unknown]
  return rows[0] ?? null
}

export function buildTaggingWhere(batchId: number, filters: TaggingFilters, alias = 'a') {
  const clauses = [`${alias}.batch_id = ?`]
  const params: Array<string | number> = [batchId]
  const equals: Array<[keyof TaggingFilters, string]> = [
    ['kdkec', 'kdkec'], ['kddesa', 'kddesa'], ['idsls', 'idsls'], ['idsubsls', 'idsubsls'], ['status', 'status_alias'],
  ]
  for (const [key, column] of equals) {
    const value = filters[key]
    if (typeof value === 'string' && value) {
      clauses.push(`${alias}.${column} = ?`)
      params.push(value)
    }
  }
  if (filters.kind === 'keluarga') clauses.push(`${alias}.ada_keluarga_label IS NOT NULL`)
  if (filters.kind === 'usaha') clauses.push(`${alias}.ada_bang_usaha_label IS NOT NULL`)
  if (filters.accuracy === 'good') clauses.push(`${alias}.has_coordinate=1 AND (${alias}.geotag_accuracy IS NULL OR ${alias}.geotag_accuracy <= 50)`)
  if (filters.accuracy === 'low') clauses.push(`${alias}.geotag_accuracy > 50`)
  if (filters.accuracy === 'missing') clauses.push(`${alias}.has_coordinate=0`)
  if (filters.warning) {
    clauses.push(`EXISTS (SELECT 1 FROM tagging_warning tw WHERE tw.batch_id=${alias}.batch_id AND (tw.assignment_id=${alias}.assignment_id OR (tw.cluster_key IS NOT NULL AND tw.cluster_key IN (${alias}.exact_cluster_key, ${alias}.near_cluster_key))) AND tw.warning_type=?)`)
    params.push(filters.warning)
  }
  if (filters.search) {
    clauses.push(`(${alias}.assignment_id LIKE ? OR ${alias}.level_6_full_code LIKE ?)`)
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }
  return { sql: clauses.join(' AND '), params }
}
