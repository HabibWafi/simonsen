'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import type { Layer } from 'leaflet'
import { buildKecamatanTooltipHtml } from './KecamatanTooltip'
import type { ProgressBreakdown } from '@/types'

interface SlsRow {
  idsls: string       // 14-digit komposit
  kdsls: string
  nmsls: string
  target_usaha: number
  realisasi: number
  persentase: number
  breakdown?: ProgressBreakdown | null
}

type Props = {
  iddesa: string      // 10-digit komposit: kdprov+kdkab+kdkec+kddesa
  nmdesa: string
  nmkec?: string      // optional, untuk breadcrumb badge
  skala: '' | 'UMK' | 'UM' | 'UB'
  onBack: () => void
}

function pctToColor(pct: number): string {
  if (pct >= 80)  return '#00A651'
  if (pct >= 60)  return '#5BB85B'
  if (pct >= 40)  return '#E8751A'
  if (pct >= 20)  return '#F5A623'
  if (pct > 0)    return '#FDDCAA'
  return '#FFF0DC'
}

export default function MapSls({ iddesa, nmdesa, nmkec, skala, onBack }: Props) {
  const [geoJson, setGeoJson] = useState<FeatureCollection | null>(null)
  const [slsData, setSlsData] = useState<SlsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null)
  const [selId, setSelId] = useState('')   // SLS terpilih → disorot

  useEffect(() => {
    let cancel = false
    setLoading(true)
    // 1 fetch — server kembalikan geojson sudah ter-filter + aggregate
    fetch(`/api/progress/sls?desa=${encodeURIComponent(iddesa)}${skala ? `&skala=${skala}` : ''}&geojson=1`)
      .then(r => r.json())
      .then(json => {
        if (cancel) return
        const fc: FeatureCollection = json.geojson ?? { type: 'FeatureCollection', features: [] }
        setGeoJson(fc)
        setSlsData(json.data ?? [])

        if (fc.features.length > 0) {
          try {
            const layer = L.geoJSON(fc as any)
            const b = layer.getBounds()
            if (b.isValid()) setBounds(b)
          } catch {}
        }
      })
      .catch(() => { if (!cancel) setGeoJson({ type: 'FeatureCollection', features: [] }) })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [iddesa, skala])

  // Map dari idsls (14-digit) → SlsRow. Fallback: 4-digit kdsls match.
  const byKey = useMemo(() => {
    const m = new Map<string, SlsRow>()
    for (const d of slsData) {
      if (d.idsls) m.set(d.idsls, d)
      if (d.kdsls) m.set(d.kdsls, d) // fallback kalau kdsls lokal
    }
    return m
  }, [slsData])

  const style = (feature?: Feature) => {
    const p = feature?.properties ?? {}
    const idsls = String(p.idsls ?? '')
    const kdsls = String(p.kdsls ?? '')
    const d = byKey.get(idsls) || byKey.get(kdsls)
    const pct = d?.persentase ?? 0
    const fid = idsls || kdsls
    const isSel = fid !== '' && fid === selId
    return {
      fillColor: pctToColor(pct),
      weight: isSel ? 3.2 : 1.1,
      opacity: 1,
      color: isSel ? '#FFFFFF' : '#C85E0A',
      fillOpacity: isSel ? 0.92 : 0.78,
      className: isSel ? 'map-feat-selected' : '',
    }
  }

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const p = feature.properties ?? {}
    const idsls = String(p.idsls ?? '')
    const kdsls = String(p.kdsls ?? '')
    const nmsls = String(p.nmsls ?? '')
    const d = byKey.get(idsls) || byKey.get(kdsls)

    const html = d
      ? `<div style="font-family:Inter,sans-serif;min-width:220px">
          ${buildKecamatanTooltipHtml({
            nama: `SLS ${nmsls || kdsls}`,
            target: d.target_usaha,
            realisasi: d.realisasi,
            persentase: d.persentase,
            breakdown: d.breakdown ?? undefined,
            fasih: (d as any).fasih ?? undefined,
            skalaFilter: skala,
          })}
        </div>`
      : `<div style="font-family:Inter,sans-serif;min-width:200px">
          <strong style="font-size:13px;color:#1A1A1A">SLS ${nmsls || kdsls}</strong><br/>
          <span style="font-size:11px;color:#8C7B6B">Belum ada assignment tercatat di SLS ini.</span><br/>
          <span style="font-size:10px;color:#A89A8C;font-style:italic">Jika seharusnya ada, periksa kolom KDSLS di file import.</span>
        </div>`
    ;(layer as any).bindTooltip(html, { permanent: false, sticky: true })

    const fid = idsls || kdsls
    if (fid && fid === selId) {
      queueMicrotask(() => { try { (layer as any).bringToFront?.() } catch {} })
    }

    layer.on({
      click: () => setSelId(fid),
      mouseover: (e: any) => { e.target.setStyle({ weight: 2.4, fillOpacity: 0.92 }); try { e.target.bringToFront?.() } catch {} },
      mouseout: (e: any) => { e.target.setStyle(style(feature)) },
    })
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
      }}>← Kembali ke Peta Desa</button>

      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 600,
        padding: '8px 14px', borderRadius: 99,
        background: 'rgba(26,26,26,.85)', color: 'white',
        fontSize: 12, fontWeight: 700,
        boxShadow: '0 4px 12px rgba(0,0,0,.2)',
        maxWidth: 280,
      }}>
        📍 {nmkec ? `${nmkec} › ` : ''}Desa {nmdesa}
        <span style={{ opacity: .7, marginLeft: 6 }}>· {featureCount} SLS</span>
      </div>

      {loading ? (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EDE0' }}>
          <p style={{ color: '#6B6B6B', fontSize: 13 }}>Memuat peta SLS…</p>
        </div>
      ) : featureCount > 0 && geoJson ? (
        <MapContainer
          {...(bounds ? { bounds } : { center: [-3.0, 102.95] as L.LatLngExpression, zoom: 12 })}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoJSON key={iddesa + skala + selId} data={geoJson} style={style as any} onEachFeature={onEachFeature} />
        </MapContainer>
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EDE0', textAlign: 'center', padding: 24 }}>
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
            <p style={{ color: '#6B6B6B', fontSize: 13 }}>Data peta SLS tidak tersedia untuk desa ini.<br /><span style={{ fontSize: 11, color: '#8C7B6B' }}>(iddesa={iddesa})</span></p>
          </div>
        </div>
      )}
    </div>
  )
}
