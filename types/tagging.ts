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

export type TaggingMapViewport = {
  key: string
  bounds: [[number, number], [number, number]]
}

type TaggingMapContext = {
  viewport?: TaggingMapViewport
  contextGeojson?: GeoJSON.FeatureCollection
}

export type TaggingMapResponse =
  | ({ mode: 'empty'; data: [] } & TaggingMapContext)
  | ({ mode: 'polygons'; geojson: GeoJSON.FeatureCollection } & TaggingMapContext)
  | ({ mode: 'clusters'; data: TaggingCluster[]; truncated?: boolean } & TaggingMapContext)
  | ({ mode: 'points'; data: TaggingPoint[]; truncated?: boolean } & TaggingMapContext)

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
