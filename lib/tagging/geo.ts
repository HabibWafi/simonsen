import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'
import type { TaggingFilters } from './query'

let collectionCache: FeatureCollection | null = null

export function getTaggingGeoCollection(): FeatureCollection {
  if (!collectionCache) {
    collectionCache = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/geo/musirawas_sls-subsls.geojson'), 'utf8'),
    ) as FeatureCollection
  }
  return collectionCache
}

export function safeTaggingFeature(feature: Feature): Feature<Geometry, GeoJsonProperties> {
  const p = feature.properties ?? {}
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      idsubsls: String(p.idsubsls ?? ''), idsls: String(p.idsls ?? ''),
      kdkec: String(p.idsubsls ?? '').slice(0, 7),
      kddesa: String(p.idsubsls ?? '').slice(0, 10),
      kdsls: String(p.kdsls ?? ''), kdsubsls: String(p.kdsubsls ?? ''),
      nmkec: String(p.nmkec ?? ''), nmdesa: String(p.nmdesa ?? ''), nmsls: String(p.nmsls ?? ''),
      luas: Number(p.luas ?? 0),
    },
  }
}

function matchesRegion(feature: Feature, filters: TaggingFilters) {
  const id = String(feature.properties?.idsubsls ?? '')
  if (filters.kdkec && !id.startsWith(filters.kdkec)) return false
  if (filters.kddesa && !id.startsWith(filters.kddesa)) return false
  if (filters.idsls && !id.startsWith(filters.idsls)) return false
  return !filters.idsubsls || id === filters.idsubsls
}

export function getTaggingRegionContext(filters: TaggingFilters) {
  const regionKey = filters.idsubsls ?? filters.idsls ?? filters.kddesa ?? filters.kdkec ?? ''
  const features = getTaggingGeoCollection().features
    .filter(feature => matchesRegion(feature, filters))
    .map(safeTaggingFeature)

  if (!features.length) return { regionKey, features, viewport: undefined }

  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity
  const visit = (coordinates: unknown) => {
    if (!Array.isArray(coordinates)) return
    if (coordinates.length >= 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      const [longitude, latitude] = coordinates as [number, number]
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        south = Math.min(south, latitude)
        west = Math.min(west, longitude)
        north = Math.max(north, latitude)
        east = Math.max(east, longitude)
      }
      return
    }
    for (const child of coordinates) visit(child)
  }
  for (const feature of features) {
    if (feature.geometry && 'coordinates' in feature.geometry) visit(feature.geometry.coordinates)
  }

  const viewport = Number.isFinite(south) && Number.isFinite(west) && Number.isFinite(north) && Number.isFinite(east)
    ? { key: regionKey || 'all', bounds: [[south, west], [north, east]] as [[number, number], [number, number]] }
    : undefined
  return { regionKey, features, viewport }
}
