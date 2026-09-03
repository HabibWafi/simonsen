export type TaggingFilterState = {
  kdkec: string
  kddesa: string
  idsls: string
  idsubsls: string
  status: string
  warning: string
  kind: string
  accuracy: string
  search: string
}

export type TaggingOption = { code: string; name?: string; total: number }

export type TaggingMapResponse =
  | { mode: 'empty'; data: [] }
  | { mode: 'polygons'; geojson: GeoJSON.FeatureCollection }
  | { mode: 'clusters'; data: TaggingCluster[] }
  | { mode: 'points'; data: TaggingPoint[]; truncated?: boolean }

export type TaggingCluster = {
  latitude: number
  longitude: number
  total: number
  warnings: number
  exact_duplicates: number
}

export type TaggingPoint = {
  assignment_id: string
  status_alias: string
  latitude: number
  longitude: number
  accuracy: number | null
  warning_count: number
  exact_cluster_size: number
  near_cluster_size: number
  level_6_full_code: string
  nmkec: string | null
  nmdesa: string | null
  nmsls: string | null
}
