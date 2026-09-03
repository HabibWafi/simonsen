'use client'

import { useEffect, useMemo } from 'react'
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Feature } from 'geojson'
import type { Layer } from 'leaflet'
import type { TaggingMapResponse } from '@/types/tagging'
import 'leaflet/dist/leaflet.css'

type Props = {
  data: TaggingMapResponse
  metric: 'total' | 'warnings' | 'approved'
  onZoom: (zoom: number) => void
  onSelectAssignment: (id: string) => void
  onSelectSubSls: (code: string) => void
}

function MapEvents({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({ zoomend(event) { onZoom(event.target.getZoom()) } })
  return null
}

function FitPolygons({ data }: { data: GeoJSON.FeatureCollection | null }) {
  const map = useMap()
  useEffect(() => {
    if (!data?.features.length) return
    const bounds = L.geoJSON(data).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 14 })
  }, [data, map])
  return null
}

function polygonColor(value: number, max: number, metric: Props['metric']) {
  if (!value) return '#F5EBDD'
  const ratio = Math.min(1, value / Math.max(1, max))
  if (metric === 'warnings') return ratio > .65 ? '#9F1239' : ratio > .35 ? '#E11D48' : ratio > .12 ? '#FB7185' : '#FECDD3'
  if (metric === 'approved') return ratio > .65 ? '#047857' : ratio > .35 ? '#10B981' : ratio > .12 ? '#6EE7B7' : '#D1FAE5'
  return ratio > .65 ? '#9A3412' : ratio > .35 ? '#EA580C' : ratio > .12 ? '#FB923C' : '#FED7AA'
}

export default function TaggingMap({ data, metric, onZoom, onSelectAssignment, onSelectSubSls }: Props) {
  const polygons = data.mode === 'polygons' ? data.geojson : null
  const maxMetric = useMemo(() => {
    if (!polygons) return 1
    return Math.max(1, ...polygons.features.map(feature => Number(feature.properties?.[metric] ?? 0)))
  }, [polygons, metric])

  const style = (feature?: Feature) => {
    const value = Number(feature?.properties?.[metric] ?? 0)
    return { fillColor: polygonColor(value, maxMetric, metric), color: '#FFF8ED', weight: 1.2, opacity: 1, fillOpacity: .82 }
  }

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const p = feature.properties ?? {}
    const total = Number(p.total ?? 0)
    const warning = Number(p.warnings ?? 0)
    const rate = total ? warning / total * 100 : 0
    layer.bindTooltip(`<div style="min-width:190px;font-family:ui-sans-serif,sans-serif"><b>${String(p.nmdesa ?? '')} · ${String(p.nmsls ?? '')}</b><br/><span style="font-size:11px;color:#64748b">Sub-SLS ${String(p.kdsubsls ?? '')}</span><hr style="border:0;border-top:1px solid #e2e8f0"/><b>${total.toLocaleString('id-ID')}</b> assignment · <b style="color:#be123c">${warning.toLocaleString('id-ID')}</b> warning<br/><span style="font-size:11px">Rasio warning ${rate.toFixed(1)}%</span></div>`, { sticky: true })
    layer.on({ click: () => onSelectSubSls(String(p.idsubsls ?? '')) })
  }

  return <MapContainer center={[-3.12, 103.08]} zoom={11} preferCanvas style={{ height: '100%', width: '100%', background: '#E8E1D5' }}>
    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapEvents onZoom={onZoom} />
    <FitPolygons data={polygons} />
    {polygons && <GeoJSON key={`${metric}-${polygons.features.length}`} data={polygons} style={style} onEachFeature={onEachFeature} />}
    {data.mode === 'clusters' && data.data.map((cluster, index) => {
      const warningRate = Number(cluster.total) ? Number(cluster.warnings) / Number(cluster.total) : 0
      const color = Number(cluster.exact_duplicates) > 0 ? '#111827' : warningRate > .5 ? '#BE123C' : '#E8751A'
      return <CircleMarker key={`${cluster.latitude}-${cluster.longitude}-${index}`} center={[Number(cluster.latitude), Number(cluster.longitude)]} radius={Math.min(26, 6 + Math.log2(Number(cluster.total) + 1) * 2.6)} pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: .88 }}><Tooltip><b>{Number(cluster.total).toLocaleString('id-ID')} assignment</b><br/>{Number(cluster.warnings).toLocaleString('id-ID')} memiliki warning</Tooltip></CircleMarker>
    })}
    {data.mode === 'points' && data.data.map(point => {
      const duplicate = Number(point.exact_cluster_size) > 1
      const warning = Number(point.warning_count) > 0
      const color = duplicate ? '#111827' : warning ? '#BE123C' : /APPROVED|COMPLETED/.test(point.status_alias) ? '#047857' : '#E8751A'
      return <CircleMarker key={point.assignment_id} center={[Number(point.latitude), Number(point.longitude)]} radius={duplicate ? 8 : 5} pathOptions={{ color: duplicate ? '#FBBF24' : '#fff', weight: duplicate ? 3 : 1.5, fillColor: color, fillOpacity: .9 }} eventHandlers={{ click: () => onSelectAssignment(point.assignment_id) }}><Tooltip><b>{point.assignment_id.slice(0, 8)}…</b><br/>{point.status_alias}<br/>{point.nmdesa ?? 'Tidak terpetakan'} · {point.nmsls ?? 'SLS —'}{warning && <><br/><b style={{ color: '#BE123C' }}>{point.warning_count} warning</b></>}</Tooltip></CircleMarker>
    })}
  </MapContainer>
}
