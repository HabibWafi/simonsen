import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'

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
