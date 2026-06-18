'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import type { Layer } from 'leaflet'
import { withBase } from '@/lib/basePath'
import { buildKecamatanTooltipHtml } from './KecamatanTooltip'
import type { ProgressBreakdown } from '@/types'

interface DesaRow {
  kddesa: string
  nmdesa: string
  kdkec: string
  target_usaha: number
  realisasi: number
  persentase: number
  breakdown?: ProgressBreakdown | null
}

type Props = {
  kdkec: string  // 7-digit composed: kdprov+kdkab+kdkec, e.g. "1605030"
  nmkec: string
  skala: '' | 'UMK' | 'UM' | 'UB'
  onBack: () => void
  /** Klik desa → drill-down ke peta SLS. iddesa = 10-digit komposit. */
  onDesaClick?: (iddesa: string, nmdesa: string) => void
}

function pctToColor(pct: number): string {
  if (pct >= 80)  return '#00A651'
  if (pct >= 60)  return '#5BB85B'
  if (pct >= 40)  return '#E8751A'
  if (pct >= 20)  return '#F5A623'
  if (pct > 0)    return '#FDDCAA'
  return '#FFF0DC'
}

/** Compose 7-digit kdkec key from desa GeoJSON properties (which only has 3-digit kdkec). */
function composedKdkec(props: any): string {
  return `${props?.kdprov ?? ''}${props?.kdkab ?? ''}${props?.kdkec ?? ''}`
}

export default function MapDesa({ kdkec, nmkec, skala, onBack, onDesaClick }: Props) {
  const [geoJson, setGeoJson] = useState<FeatureCollection | null>(null)
  const [desaData, setDesaData] = useState<DesaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(withBase('/geo/musirawas_desa.geojson')).then(r => r.json()),
      fetch(`/api/progress/desa?kec=${encodeURIComponent(kdkec)}${skala ? `&skala=${skala}` : ''}`).then(r => r.json()),
    ])
      .then(([geo, agg]) => {
        // FIX iterasi 5: compose kdprov+kdkab+kdkec dari properties (idkec field MISSING di desa geojson)
        // FIX iterasi 9: fallback match by nmkec (tahan drift kode kdkec)
        const nm = nmkec.toUpperCase().trim()
        const allFeatures = (geo as FeatureCollection).features
        let filtered = allFeatures.filter(f => composedKdkec(f.properties) === kdkec)
        if (filtered.length === 0 && nm) {
          filtered = allFeatures.filter(f => String(f.properties?.nmkec ?? '').toUpperCase().trim() === nm)
        }
        const fc: FeatureCollection = { type: 'FeatureCollection', features: filtered }
        setGeoJson(fc)
        setDesaData(agg.data ?? [])

        // Auto-fit bounds dari filtered features
        if (filtered.length > 0) {
          try {
            const layer = L.geoJSON(fc as any)
            const b = layer.getBounds()
            if (b.isValid()) setBounds(b)
          } catch {}
        }
      })
      .finally(() => setLoading(false))
  }, [kdkec, skala])

  const byKey = useMemo(() => {
    const m = new Map<string, DesaRow>()
    for (const d of desaData) m.set(d.kddesa, d)
    return m
  }, [desaData])

  const style = (feature?: Feature) => {
    const iddesa = String(feature?.properties?.iddesa ?? '')
    const d = byKey.get(iddesa)
    const pct = d?.persentase ?? 0
    return {
      fillColor: pctToColor(pct),
      weight: 1.2,
      opacity: 1,
      color: '#C85E0A',
      fillOpacity: 0.78,
    }
  }

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const iddesa = String(feature.properties?.iddesa ?? '')
    const nmdesa = String(feature.properties?.nmdesa ?? '')
    const d = byKey.get(iddesa)
    const drillHint = onDesaClick
      ? `<div style="font-size:10px;color:#8C7B6B;margin-top:8px;border-top:1px dashed #ddd;padding-top:6px">Klik untuk drill-down ke SLS →</div>`
      : ''
    const html = d
      ? `<div style="font-family:Inter,sans-serif;min-width:220px">
          ${buildKecamatanTooltipHtml({
            nama: `Desa ${nmdesa}`,
            target: d.target_usaha,
            realisasi: d.realisasi,
            persentase: d.persentase,
            breakdown: d.breakdown ?? undefined,
            fasih: (d as any).fasih ?? undefined,
            skalaFilter: skala,
          })}
          ${drillHint}
        </div>`
      : `<div style="font-family:Inter,sans-serif;min-width:160px">
          <strong style="font-size:13px;color:#1A1A1A">Desa ${nmdesa}</strong><br/>
          <span style="font-size:11px;color:#8C7B6B">Belum ada data usaha</span>
          ${drillHint}
        </div>`
    ;(layer as any).bindTooltip(html, { permanent: false, sticky: true })

    if (onDesaClick) {
      layer.on({ click: () => onDesaClick(iddesa, nmdesa) })
    }
  }

  const featureCount = geoJson?.features.length ?? 0

  return (
    <div style={{ position: 'relative', height: 480, borderRadius: 14, overflow: 'hidden', border: '1px solid #EDE3D8' }}>
      <button onClick={onBack} style={{
        position: 'absolute', top: 12, left: 12, zIndex: 600,
        padding: '8px 14px', borderRadius: 99,
        background: 'rgba(255,255,255,.96)', color: '#E8751A',
        border: '1px solid rgba(232,117,26,.3)',
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,.12)',
        backdropFilter: 'blur(6px)',
      }}>← Kembali ke Peta Kecamatan</button>

      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 600,
        padding: '8px 14px', borderRadius: 99,
        background: 'rgba(26,26,26,.85)', color: 'white',
        fontSize: 12, fontWeight: 700,
        boxShadow: '0 4px 12px rgba(0,0,0,.2)',
      }}>📍 Kec. {nmkec} <span style={{ opacity: .7, marginLeft: 6 }}>· {featureCount} desa</span></div>

      {loading ? (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EDE0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 13 }}>Memuat peta desa…</p>
        </div>
      ) : featureCount > 0 && geoJson ? (
        <MapContainer
          {...(bounds ? { bounds } : { center: [-3.0, 102.95] as L.LatLngExpression, zoom: 11 })}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoJSON key={kdkec + skala} data={geoJson} style={style as any} onEachFeature={onEachFeature} />
        </MapContainer>
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EDE0', textAlign: 'center', padding: 24 }}>
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
            <p style={{ color: '#6B6B6B', fontSize: 13 }}>Data peta desa tidak tersedia untuk kecamatan ini.<br /><span style={{ fontSize: 11, color: '#8C7B6B' }}>(kdkec={kdkec})</span></p>
          </div>
        </div>
      )}
    </div>
  )
}
