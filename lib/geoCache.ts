'use client'

import { withBase } from '@/lib/basePath'

/**
 * Cache GeoJSON kecamatan di module-scope (per tab browser).
 * Sekali load → dipakai ulang instan di beranda & halaman progress, jadi
 * placeholder "Memuat peta…" hanya muncul sekali (tidak nyangkut karena cache).
 * Ada retry ringan supaya tidak stuck kalau fetch pertama gagal.
 */
let cache: GeoJSON.FeatureCollection | null = null
let inflight: Promise<GeoJSON.FeatureCollection | null> | null = null

export function getCachedKecGeo(): GeoJSON.FeatureCollection | null {
  return cache
}

export async function loadKecGeo(): Promise<GeoJSON.FeatureCollection | null> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(withBase('/geo/musirawas_kec.geojson'))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        cache = json
        return json
      } catch {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
      }
    }
    return null
  })()
  const result = await inflight
  inflight = null
  return result
}
