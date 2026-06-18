'use client'

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Feature } from 'geojson'
import type { Layer, LeafletMouseEvent } from 'leaflet'
import { buildKecamatanTooltipHtml } from './KecamatanTooltip'
import type { SkalaUsaha, ProgressBreakdown } from '@/types'

type ProgressData = {
  kdkec?: string
  kecamatan?: string
  nmkec?: string
  target_usaha: number
  realisasi: number
  persentase: number
  breakdown?: ProgressBreakdown | null
}

type Props = {
  data: ProgressData[]
  geoJson: GeoJSON.FeatureCollection
  onKecClick?: (kdkec: string, nmkec: string) => void
  activeKec?: string | null
  skalaFilter?: SkalaUsaha | ''
}

function pctToColor(pct: number): string {
  if (pct >= 80)  return '#00A651'
  if (pct >= 60)  return '#5BB85B'
  if (pct >= 40)  return '#E8751A'
  if (pct >= 20)  return '#F5A623'
  if (pct > 0)    return '#FDDCAA'
  return '#FFF0DC'
}

export default function MapKecamatan({ data, geoJson, onKecClick, activeKec, skalaFilter = '' }: Props) {
  // index data by both kdkec (idkec di geojson) dan nmkec for fallback
  const byKey = new Map<string, ProgressData>()
  for (const d of data) {
    if (d.kdkec) byKey.set(d.kdkec, d)
    const name = (d.nmkec ?? d.kecamatan ?? '').toUpperCase()
    if (name) byKey.set(name, d)
  }

  const style = (feature?: Feature) => {
    const idkec = String(feature?.properties?.idkec ?? '')
    const nmkec = String(feature?.properties?.nmkec ?? '').toUpperCase()
    const d = byKey.get(idkec) || byKey.get(nmkec)
    const pct = d?.persentase ?? 0
    const isActive = activeKec && idkec === activeKec
    return {
      fillColor: pctToColor(pct),
      weight: isActive ? 3 : 1.2,
      opacity: 1,
      color: isActive ? '#1A1A1A' : '#C85E0A',
      fillOpacity: 0.78,
      dashArray: isActive ? undefined : '0',
    }
  }

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const idkec = String(feature.properties?.idkec ?? '')
    const nmkec = String(feature.properties?.nmkec ?? '')
    const d = byKey.get(idkec) || byKey.get(nmkec.toUpperCase())

    const html = d
      ? `<div style="font-family:Inter,sans-serif;min-width:220px">
          ${buildKecamatanTooltipHtml({
            nama: nmkec,
            target: d.target_usaha,
            realisasi: d.realisasi,
            persentase: d.persentase,
            breakdown: d.breakdown ?? undefined,
            fasih: (d as any).fasih ?? undefined,
            skalaFilter,
          })}
          <div style="font-size:10px;color:#8C7B6B;margin-top:8px;border-top:1px dashed #ddd;padding-top:6px">Klik untuk drill-down ke desa →</div>
        </div>`
      : `<div style="font-family:Inter,sans-serif;min-width:160px">
          <strong style="font-size:13px;color:#1A1A1A">${nmkec}</strong><br/>
          <span style="font-size:11px;color:#8C7B6B">Belum ada data</span>
        </div>`
    ;(layer as any).bindTooltip(html, { permanent: false, sticky: true, className: 'leaflet-custom-tooltip' })

    layer.on({
      click: () => onKecClick?.(idkec, nmkec),
      mouseover: (e: LeafletMouseEvent) => {
        (e.target as any).setStyle({ weight: 2.5, fillOpacity: 0.9 })
      },
      mouseout: (e: LeafletMouseEvent) => {
        (e.target as any).setStyle(style(feature))
      },
    })
  }

  return (
    <div style={{ position: 'relative', height: 480, borderRadius: 14, overflow: 'hidden', border: '1px solid #EDE3D8' }}>
      <MapContainer center={[-3.0, 102.95]} zoom={9} style={{ height: '100%', width: '100%' }} zoomControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON key={JSON.stringify({ data, activeKec })} data={geoJson} style={style as any} onEachFeature={onEachFeature} />
      </MapContainer>

      <div style={legendStyle}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Realisasi</p>
        {[
          { color: '#FFF0DC', label: '0%' },
          { color: '#FDDCAA', label: '1–19%' },
          { color: '#F5A623', label: '20–39%' },
          { color: '#E8751A', label: '40–59%' },
          { color: '#5BB85B', label: '60–79%' },
          { color: '#00A651', label: '≥80%' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: l.color, border: '1px solid #EDE3D8', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#6B6B6B' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const legendStyle: React.CSSProperties = {
  position: 'absolute', bottom: 16, right: 16,
  background: 'white', borderRadius: 10, padding: '10px 14px',
  boxShadow: '0 2px 12px rgba(0,0,0,.12)', zIndex: 500, border: '1px solid #EDE3D8',
}
