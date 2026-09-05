'use client'

import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Feature } from 'geojson'
import type { Layer } from 'leaflet'
import type { TaggingCluster, TaggingMapResponse, TaggingMapViewport, TaggingPoint } from '@/types/tagging'
import 'leaflet/dist/leaflet.css'

type Props = {
  data: TaggingMapResponse
  dataVersion: string
  metric: 'total' | 'warnings' | 'approved'
  onZoom: (zoom: number) => void
  onSelectAssignment: (id: string) => void
  onSelectSubSls: (code: string) => void
}

function MapEvents({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({ zoomend(event) { onZoom(event.target.getZoom()) } })
  return null
}

function FitViewport({ viewport }: { viewport?: TaggingMapViewport }) {
  const map = useMap()
  const fittedKey = useRef('')
  useEffect(() => {
    if (!viewport) {
      fittedKey.current = ''
      return
    }
    if (fittedKey.current === viewport.key) return
    fittedKey.current = viewport.key
    map.stop()
    map.fitBounds(viewport.bounds, { padding: [22, 22], maxZoom: 17, animate: false })
  }, [map, viewport])
  return null
}

function polygonColor(value: number, max: number, metric: Props['metric']) {
  if (!value) return '#F5EBDD'
  const ratio = Math.min(1, value / Math.max(1, max))
  if (metric === 'warnings') return ratio > .65 ? '#9F1239' : ratio > .35 ? '#E11D48' : ratio > .12 ? '#FB7185' : '#FECDD3'
  if (metric === 'approved') return ratio > .65 ? '#047857' : ratio > .35 ? '#10B981' : ratio > .12 ? '#6EE7B7' : '#D1FAE5'
  return ratio > .65 ? '#9A3412' : ratio > .35 ? '#EA580C' : ratio > .12 ? '#FB923C' : '#FED7AA'
}

function tooltipContent(lines: Array<{ text: string; strong?: boolean; color?: string }>) {
  const root = document.createElement('div')
  root.style.minWidth = '150px'
  root.style.fontFamily = 'ui-sans-serif, sans-serif'
  for (const line of lines) {
    const row = document.createElement('div')
    row.textContent = line.text
    if (line.strong) row.style.fontWeight = '700'
    if (line.color) row.style.color = line.color
    root.appendChild(row)
  }
  return root
}

function ClusterLayer({ data }: { data: TaggingCluster[] }) {
  const map = useMap()
  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    for (const cluster of data) {
      const total = Number(cluster.total)
      const warnings = Number(cluster.warnings)
      const warningRate = total ? warnings / total : 0
      const color = Number(cluster.exact_duplicates) > 0 ? '#111827' : warningRate > .5 ? '#BE123C' : '#E8751A'
      L.circleMarker([Number(cluster.latitude), Number(cluster.longitude)], {
        radius: Math.min(26, 6 + Math.log2(total + 1) * 2.6),
        color: '#fff', weight: 2, fillColor: color, fillOpacity: .88,
      })
        .bindTooltip(tooltipContent([
          { text: `${total.toLocaleString('id-ID')} assignment`, strong: true },
          { text: `${warnings.toLocaleString('id-ID')} memiliki warning`, color: warnings ? '#BE123C' : undefined },
        ]))
        .addTo(group)
    }
    return () => { group.remove() }
  }, [data, map])
  return null
}

function PointLayer({ data, onSelectAssignment }: { data: TaggingPoint[]; onSelectAssignment: (id: string) => void }) {
  const map = useMap()
  useEffect(() => {
    const group = L.layerGroup().addTo(map)
    for (const point of data) {
      const duplicate = Number(point.exact_cluster_size) > 1
      const warning = Number(point.warning_count) > 0
      const color = duplicate ? '#111827' : warning ? '#BE123C' : /APPROVED|COMPLETED/.test(point.status_alias) ? '#047857' : '#E8751A'
      L.circleMarker([Number(point.latitude), Number(point.longitude)], {
        radius: duplicate ? 8 : 5,
        color: duplicate ? '#FBBF24' : '#fff', weight: duplicate ? 3 : 1.5, fillColor: color, fillOpacity: .9,
      })
        .bindTooltip(tooltipContent([
          { text: `${point.assignment_id.slice(0, 8)}…`, strong: true },
          { text: point.status_alias },
          { text: `${point.nmdesa ?? 'Tidak terpetakan'} · ${point.nmsls ?? 'SLS —'}` },
          ...(warning ? [{ text: `${point.warning_count} warning`, strong: true, color: '#BE123C' }] : []),
        ]))
        .on('click', () => onSelectAssignment(point.assignment_id))
        .addTo(group)
    }
    return () => { group.remove() }
  }, [data, map, onSelectAssignment])
  return null
}

export default function TaggingMap({ data, dataVersion, metric, onZoom, onSelectAssignment, onSelectSubSls }: Props) {
  const polygons = data.mode === 'polygons' ? data.geojson : null
  const contextPolygons = data.mode !== 'polygons' ? data.contextGeojson : null
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
    layer.bindTooltip(tooltipContent([
      { text: `${String(p.nmdesa ?? '')} · ${String(p.nmsls ?? '')}`, strong: true },
      { text: `Sub-SLS ${String(p.kdsubsls ?? '')}` },
      { text: `${total.toLocaleString('id-ID')} assignment · ${warning.toLocaleString('id-ID')} warning` },
      { text: `Rasio warning ${rate.toFixed(1)}%`, color: warning ? '#BE123C' : undefined },
    ]), { sticky: true })
    layer.on({ click: () => onSelectSubSls(String(p.idsubsls ?? '')) })
  }

  const onEachContextFeature = (feature: Feature, layer: Layer) => {
    const p = feature.properties ?? {}
    layer.bindTooltip(tooltipContent([
      { text: `${String(p.nmdesa ?? '')} · ${String(p.nmsls ?? '')}`, strong: true },
      { text: `Sub-SLS ${String(p.kdsubsls ?? '')}` },
    ]), { sticky: true })
    layer.on({ click: () => onSelectSubSls(String(p.idsubsls ?? '')) })
  }

  return <MapContainer center={[-3.12, 103.08]} zoom={11} preferCanvas style={{ height: '100%', width: '100%', background: '#E8E1D5' }}>
    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapEvents onZoom={onZoom} />
    <FitViewport viewport={data.viewport} />
    {polygons && <GeoJSON key={`metric-${dataVersion}`} data={polygons} style={style} onEachFeature={onEachFeature} />}
    {contextPolygons && <GeoJSON key={`context-${dataVersion}`} data={contextPolygons} style={{ color: '#E8751A', weight: 1.4, opacity: .9, fillColor: '#FDBA74', fillOpacity: .06 }} onEachFeature={onEachContextFeature} />}
    {data.mode === 'clusters' && <ClusterLayer data={data.data} />}
    {data.mode === 'points' && <PointLayer data={data.data} onSelectAssignment={onSelectAssignment} />}
  </MapContainer>
}
