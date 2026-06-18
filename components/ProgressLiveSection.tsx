'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import DotsPattern from '@/components/decor/DotsPattern'
import KecamatanTooltip from '@/components/KecamatanTooltip'
import LiveUpdateBadge from '@/components/LiveUpdateBadge'
import { withBase } from '@/lib/basePath'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { mockProgress, mockStats } from '@/lib/mockData'
import type { ProgressBreakdown, SkalaUsaha } from '@/types'

const MapLoader = () => (
  <div style={{ height: 480, borderRadius: 14, background: '#F5EDE0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EDE3D8' }}>
    <div style={{ textAlign: 'center', color: '#6B6B6B' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
      <p style={{ fontSize: 13 }}>Memuat peta…</p>
    </div>
  </div>
)

const MapKecamatan = dynamic(() => import('@/components/MapKecamatan'), { ssr: false, loading: MapLoader })
const MapDesa = dynamic(() => import('@/components/MapDesa'), { ssr: false, loading: MapLoader })
const MapSls  = dynamic(() => import('@/components/MapSls'),  { ssr: false, loading: MapLoader })

const EASE = [0.22, 1, 0.36, 1] as const

const dropdownStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #EDE3D8',
  background: 'white', fontSize: 12, fontWeight: 700, color: '#3D3D3D',
  cursor: 'pointer', outline: 'none', marginBottom: 12,
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#8C7B6B', textTransform: 'uppercase',
  letterSpacing: 1, marginBottom: 6, display: 'block',
}

type SkalaFilter = '' | SkalaUsaha
type LiveRow = (typeof mockProgress)[number] & { breakdown?: ProgressBreakdown | null }

interface Props {
  progress: typeof mockProgress
  stats: typeof mockStats
}

/* ── Animated counter (in-view triggered, easeOut cubic) ── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function AnimatedNumber({ value, duration = 1400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const { ref, inView } = useInView()
  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value, duration])
  return <span ref={ref}>{display.toLocaleString('id-ID')}</span>
}

/* ── Radial gauge SVG ── */
function RadialGauge({ value }: { value: number }) {
  const { ref, inView } = useInView()
  const size = 200
  const stroke = 16
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * Math.min(Math.max(value, 0), 100)) / 100

  return (
    <div ref={ref} style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FFF0DC" strokeWidth={stroke} />
        {/* Progress arc */}
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8751A" />
            <stop offset="100%" stopColor="#F5A623" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: inView ? offset : circ }}
          transition={{ duration: 1.8, ease: EASE, delay: 0.2 }}
        />
      </svg>
      {/* Center label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: '#C85E0A', lineHeight: 1, letterSpacing: -2 }}>
          <AnimatedNumber value={Math.round(value)} duration={1800} />
          <span style={{ fontSize: 24, fontWeight: 800 }}>%</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#8C7B6B', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
          Realisasi Total
        </div>
      </div>
    </div>
  )
}

export default function ProgressLiveSection({ progress: initialProgress, stats }: Props) {
  const [skalaFilter, setSkalaFilter] = useState<SkalaFilter>('')
  const [progress, setProgress] = useState<LiveRow[]>(initialProgress as any)
  const [loading, setLoading] = useState(false)
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [drillKec, setDrillKec] = useState<{ kdkec: string; nmkec: string } | null>(null)
  const [drillDesa, setDrillDesa] = useState<{ iddesa: string; nmdesa: string } | null>(null)
  // Info SLS terpilih lewat dropdown (peta tetap di level SLS, dropdown update info panel)
  const [selectedSls, setSelectedSls] = useState<{ idsls: string; nmsls: string } | null>(null)
  const isMobile = useIsMobile()

  // Dropdown data: desa list per kec (lazy fetch), SLS list per desa (lazy fetch)
  const [desaOptions, setDesaOptions] = useState<Array<{ iddesa: string; nmdesa: string; target: number; realisasi: number; persentase: number; breakdown?: ProgressBreakdown | null; fasih?: any }>>([])
  const [slsOptions, setSlsOptions] = useState<Array<{ idsls: string; nmsls: string; target_usaha: number; realisasi: number; persentase: number; breakdown?: ProgressBreakdown | null; fasih?: any }>>([])

  // Fetch desa options saat kec dipilih (dropdown).
  useEffect(() => {
    if (!drillKec) { setDesaOptions([]); return }
    fetch(`/api/progress/desa?kec=${encodeURIComponent(drillKec.kdkec)}${skalaFilter ? `&skala=${skalaFilter}` : ''}`)
      .then(r => r.json())
      .then(j => {
        const list = (j.data ?? []).map((d: any) => ({
          iddesa: d.iddesa ?? (String(d.kddesa ?? '').length >= 10 ? String(d.kddesa) : `${d.kdkec ?? ''}${d.kddesa ?? ''}`),
          nmdesa: d.nmdesa,
          target: Number(d.target_usaha ?? 0),
          realisasi: Number(d.realisasi ?? 0),
          persentase: Number(d.persentase ?? 0),
          breakdown: d.breakdown ?? null,
          fasih: d.fasih ?? null,
        }))
        setDesaOptions(list)
      })
      .catch(() => setDesaOptions([]))
  }, [drillKec?.kdkec, skalaFilter])

  // Fetch SLS options saat desa dipilih (dropdown).
  useEffect(() => {
    if (!drillDesa) { setSlsOptions([]); return }
    fetch(`/api/progress/sls?desa=${encodeURIComponent(drillDesa.iddesa)}${skalaFilter ? `&skala=${skalaFilter}` : ''}`)
      .then(r => r.json())
      .then(j => setSlsOptions(j.data ?? []))
      .catch(() => setSlsOptions([]))
  }, [drillDesa?.iddesa, skalaFilter])

  // Load GeoJSON kecamatan sekali (sama dengan halaman /se/2026/progress).
  useEffect(() => {
    fetch(withBase('/geo/musirawas_kec.geojson'))
      .then(r => r.json()).then(setGeoJson).catch(() => {})
  }, [])

  // Fetch progress — realtime: refetch tiap 60 detik (sinkron dengan bot scraper Fasih).
  useEffect(() => {
    let cancel = false
    const load = (showLoad = false) => {
      if (showLoad) setLoading(true)
      fetch('/api/progress', { cache: 'no-store' })
        .then(r => r.json())
        .then(json => {
          if (cancel) return
          if (Array.isArray(json.data) && json.data.length > 0) setProgress(json.data)
        })
        .catch(() => {})
        .finally(() => { if (!cancel) setLoading(false) })
    }
    load(true)
    const id = setInterval(() => load(false), 60000)
    return () => { cancel = true; clearInterval(id) }
  }, [])

  const top5 = [...progress].sort((a, b) => b.persentase - a.persentase).slice(0, 5)

  // Kecamatan terpilih untuk panel detail — default ke top-1.
  const rowKey = (k: LiveRow) => String((k as any).kdkec ?? k.kecamatan ?? (k as any).nmkec ?? '')
  const selected: LiveRow | null =
    (selectedKey && progress.find(k => rowKey(k) === selectedKey)) || top5[0] || null

  // Daftar kecamatan untuk dropdown filter (yang punya kdkec valid), dedup by nama.
  const kecOptions = (() => {
    const seen = new Map<string, { kdkec: string; nmkec: string }>()
    for (const k of progress) {
      const kdkec = String((k as any).kdkec ?? '')
      if (!kdkec) continue
      const nmkec = ((k as any).nmkec ?? k.kecamatan ?? '') as string
      const key = nmkec.toUpperCase().trim()
      if (!seen.has(key)) seen.set(key, { kdkec, nmkec })
    }
    return [...seen.values()].sort((a, b) => a.nmkec.localeCompare(b.nmkec))
  })()

  const statsCards = [
    { icon: '🏪', val: stats.total_target,    label: 'Total Assignment',      suffix: '' },
    { icon: '📊', val: Math.round(stats.persentase), label: 'Progress Cacah',  suffix: '%' },
    { icon: '🗺️', val: stats.kecamatan_count, label: 'Kecamatan',            suffix: '' },
    { icon: '👥', val: stats.petugas_aktif,    label: 'Petugas Aktif',         suffix: '' },
  ]

  return (
    <section style={{
      background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF6EC 100%)',
      padding: '96px 24px 80px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Pembatas wave jelas dari section Tahapan (cream) ke Progress (putih) */}
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 70 }}>
        <path d="M0,0 L1440,0 L1440,30 C1080,72 720,8 360,40 C240,50 120,46 0,30 Z" fill="#FAF8F5" />
      </svg>
      <DotsPattern position="top-right" size={260} opacity={0.10} style={{ top: 80, right: 20 }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* ── Heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFF0DC', border: '1px solid rgba(232,117,26,.25)', borderRadius: 99, padding: '6px 14px', marginBottom: 16 }}>
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [1, .4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 8, height: 8, background: '#E8192C', borderRadius: '50%', display: 'inline-block' }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#C85E0A', letterSpacing: 1.2, textTransform: 'uppercase' }}>Progress Real-Time · LIVE</span>
          </div>
          <h2 style={{ fontSize: 'clamp(26px,3.4vw,40px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 10, letterSpacing: -.8 }}>
            Pencacahan SE2026 di Lapangan
          </h2>
          <p style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
            Pantau perkembangan pencacahan SE2026 per kecamatan di Kabupaten Musi Rawas secara real-time. Data diperbarui setiap hari kerja.
          </p>

          {/* Filter skala UMK/UM/UB di-NONAKTIFKAN sementara — progress sekarang
              berbasis assignment Fasih (total vs selesai cacah), bukan per-skala.
              Akan diaktifkan lagi saat monitoring per-skala usaha siap. */}
          <div style={{ marginTop: 14, fontSize: 11, color: '#8C7B6B', display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF0DC', border: '1px solid rgba(232,117,26,.2)', borderRadius: 99, padding: '5px 12px', color: '#C85E0A', fontWeight: 700 }}>
              📊 Berdasarkan assignment Fasih
            </span>
            <LiveUpdateBadge unix={(stats as any).last_ingest_unix} label={(stats as any).last_ingest_str} />
            {loading && <span style={{ fontSize: 10, color: '#8C7B6B' }}>memuat…</span>}
          </div>
        </motion.div>

        {/* ── Row 1: Stats strip inline glassy ── */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.10 } } }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 16,
            marginBottom: 32,
          }}
          className="stats-strip"
        >
          {statsCards.map(s => (
            <motion.div
              key={s.label}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(232,117,26,.18)' }}
              style={{
                background: 'rgba(255,255,255,.78)',
                backdropFilter: 'blur(18px) saturate(160%)',
                WebkitBackdropFilter: 'blur(18px) saturate(160%)',
                border: '1px solid rgba(255,255,255,.7)',
                borderRadius: 18,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: '0 6px 20px rgba(232,117,26,.10)',
                cursor: 'default',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
                background: 'linear-gradient(135deg, #FFF0DC 0%, #F5EDE0 100%)',
                flexShrink: 0,
              }}>{s.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#C85E0A', lineHeight: 1, letterSpacing: -1, whiteSpace: 'nowrap' }}>
                  <AnimatedNumber value={s.val} />{s.suffix}
                </div>
                <div style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Row 2: Bar chart (kiri) + Gauge (kanan) ── */}
        <div className="prog-grid-2" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 24,
          marginBottom: 32,
        }}>
          {/* === Bar chart top 5 === */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{
              background: 'rgba(255,255,255,.78)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: '1px solid rgba(255,255,255,.7)',
              borderRadius: 22,
              padding: 24,
              boxShadow: '0 12px 40px rgba(232,117,26,.14), 0 2px 8px rgba(0,0,0,.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>Top 5 Kecamatan</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', letterSpacing: -.2 }}>Realisasi Tertinggi</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#00A651', background: '#E8FFF3', padding: '4px 10px', borderRadius: 99, letterSpacing: .5 }}>
                ▲ {progress.length} aktif
              </span>
            </div>

            <div>
              {top5.map((k, i) => (
                <motion.div
                  key={k.id}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
                  style={{ marginBottom: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: i === 0 ? '#E8751A' : '#FFF0DC',
                        color: i === 0 ? 'white' : '#C85E0A',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{k.kecamatan}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#C85E0A', letterSpacing: -.3 }}>{k.persentase}%</span>
                  </div>
                  <div style={{ height: 10, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                    <motion.div
                      initial={{ width: '0%' }}
                      whileInView={{ width: `${k.persentase}%` }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: EASE }}
                      style={{
                        height: '100%',
                        borderRadius: 99,
                        background: 'linear-gradient(90deg, #E8751A 0%, #F5A623 100%)',
                        boxShadow: '0 0 12px rgba(232,117,26,.45)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#6B6B6B' }}>{k.realisasi.toLocaleString('id-ID')} dicacah</span>
                    <span style={{ fontSize: 11, color: '#6B6B6B' }}>Target: {k.target_usaha.toLocaleString('id-ID')}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* === Radial gauge === */}
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            style={{
              background: 'rgba(255,255,255,.78)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: '1px solid rgba(255,255,255,.7)',
              borderRadius: 22,
              padding: 24,
              boxShadow: '0 12px 40px rgba(232,117,26,.14), 0 2px 8px rgba(0,0,0,.04)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Gauge Keseluruhan</div>
            <RadialGauge value={stats.persentase} />
            <div style={{ marginTop: 18, padding: '10px 16px', background: '#E8FFF3', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#00A651', fontWeight: 800 }}>▲ +2,1%</span>
              <span style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 600 }}>vs minggu lalu</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 10 }}>
              dari <strong style={{ color: '#1A1A1A' }}>{stats.total_target.toLocaleString('id-ID')}</strong> total assignment
            </div>
          </motion.div>
        </div>

        {/* ── Row 3: Peta choropleth (3/4) + panel detail (1/4) ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="prog-map-grid"
          style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: '3fr 1fr', gap: isMobile ? 16 : 20 }}
        >
          {(() => {
            const mapEl = (
              <div>
                <div style={{ marginBottom: 14, minHeight: isMobile ? 0 : 52 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>Peta Sebaran</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', letterSpacing: -.2 }}>
                    {drillDesa
                      ? `Peta SLS — Desa ${drillDesa.nmdesa}`
                      : drillKec
                        ? `Peta Desa — Kec. ${drillKec.nmkec}`
                        : 'Choropleth 14 Kecamatan Musi Rawas'}
                  </div>
                </div>
                {!geoJson ? (
                  <MapLoader />
                ) : drillDesa ? (
                  <MapSls
                    iddesa={drillDesa.iddesa}
                    nmdesa={drillDesa.nmdesa}
                    nmkec={drillKec?.nmkec}
                    skala={skalaFilter}
                    onBack={() => setDrillDesa(null)}
                  />
                ) : drillKec ? (
                  <MapDesa
                    kdkec={drillKec.kdkec}
                    nmkec={drillKec.nmkec}
                    skala={skalaFilter}
                    onBack={() => { setDrillKec(null); setDrillDesa(null); setSelectedSls(null) }}
                  />
                ) : (
                  <MapKecamatan
                    data={progress as any}
                    geoJson={geoJson}
                    skalaFilter={skalaFilter}
                    activeKec={selected ? String((selected as any).kdkec ?? '') : null}
                    onKecClick={(kdkec, nmkec) => {
                      const found = progress.find(k => String((k as any).kdkec ?? '') === kdkec || (k.kecamatan ?? '').toUpperCase() === nmkec.toUpperCase())
                      setSelectedKey(found ? rowKey(found) : kdkec)
                    }}
                  />
                )}
              </div>
            )

            const filterControls = (
              <>
                <label style={labelStyle}>Filter Kecamatan</label>
                <select
                  value={drillKec?.kdkec ?? ''}
                  onChange={e => {
                    const v = e.target.value
                    setDrillDesa(null); setSelectedSls(null)
                    if (!v) { setDrillKec(null); return }
                    const opt = kecOptions.find(o => o.kdkec === v)
                    if (!opt) return
                    setDrillKec(opt)
                    setSelectedKey(progress.find(k => String((k as any).kdkec ?? '') === v) ? v : selectedKey)
                  }}
                  style={dropdownStyle}
                >
                  <option value="">🗺️ Semua Kecamatan (peta kab.)</option>
                  {kecOptions.map(o => (
                    <option key={o.kdkec} value={o.kdkec}>{o.nmkec} — lihat per desa</option>
                  ))}
                </select>

                {drillKec && desaOptions.length > 0 && (
                  <>
                    <label style={labelStyle}>Filter Desa</label>
                    <select
                      value={drillDesa?.iddesa ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        setSelectedSls(null)
                        if (!v) { setDrillDesa(null); return }
                        const opt = desaOptions.find(o => o.iddesa === v)
                        if (opt) setDrillDesa({ iddesa: opt.iddesa, nmdesa: opt.nmdesa })
                      }}
                      style={dropdownStyle}
                    >
                      <option value="">— semua desa (peta kec.) —</option>
                      {desaOptions.map(o => (
                        <option key={o.iddesa} value={o.iddesa}>{o.nmdesa} — lihat per SLS</option>
                      ))}
                    </select>
                  </>
                )}

                {drillDesa && slsOptions.length > 0 && (
                  <>
                    <label style={labelStyle}>Filter SLS</label>
                    <select
                      value={selectedSls?.idsls ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        if (!v) { setSelectedSls(null); return }
                        const opt = slsOptions.find(o => o.idsls === v)
                        if (opt) setSelectedSls({ idsls: opt.idsls, nmsls: opt.nmsls })
                      }}
                      style={dropdownStyle}
                    >
                      <option value="">— pilih SLS untuk info —</option>
                      {slsOptions.map(o => (
                        <option key={o.idsls} value={o.idsls}>SLS {o.nmsls || o.idsls.slice(-4)}</option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )

            const detailContent = (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
                  Detail Daerah
                </div>
                {(() => {
                  if (selectedSls) {
                    const s = slsOptions.find(o => o.idsls === selectedSls.idsls)
                    if (s) return (
                      <>
                        <KecamatanTooltip nama={`SLS ${s.nmsls || selectedSls.idsls.slice(-4)}`} target={s.target_usaha} realisasi={s.realisasi} persentase={s.persentase} breakdown={s.breakdown ?? undefined} fasih={(s as any).fasih ?? undefined} skalaFilter={skalaFilter} />
                        <div style={{ marginTop: 14, height: 8, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${s.persentase}%`, borderRadius: 99, background: 'linear-gradient(90deg, #E8751A, #F5A623)' }} />
                        </div>
                      </>
                    )
                  }
                  if (drillDesa) {
                    const d = desaOptions.find(o => o.iddesa === drillDesa.iddesa)
                    if (d) return (
                      <>
                        <KecamatanTooltip nama={`Desa ${d.nmdesa}`} target={d.target} realisasi={d.realisasi} persentase={d.persentase} breakdown={d.breakdown ?? undefined} fasih={(d as any).fasih ?? undefined} skalaFilter={skalaFilter} />
                        <div style={{ marginTop: 14, height: 8, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.persentase}%`, borderRadius: 99, background: 'linear-gradient(90deg, #E8751A, #F5A623)' }} />
                        </div>
                      </>
                    )
                  }
                  if (selected) return (
                    <>
                      <KecamatanTooltip nama={selected.kecamatan ?? (selected as any).nmkec ?? '-'} target={selected.target_usaha} realisasi={selected.realisasi} persentase={selected.persentase} breakdown={selected.breakdown ?? undefined} fasih={(selected as any).fasih ?? undefined} skalaFilter={skalaFilter} />
                      <div style={{ marginTop: 14, height: 8, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${selected.persentase}%`, borderRadius: 99, background: 'linear-gradient(90deg, #E8751A, #F5A623)' }} />
                      </div>
                      <Link href="/se/2026/progress" style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: '#C85E0A', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Lihat detail lengkap <span aria-hidden>→</span>
                      </Link>
                    </>
                  )
                  return (
                    <p style={{ fontSize: 13, color: '#8C7B6B', lineHeight: 1.6, margin: 0 }}>
                      Pilih kecamatan di dropdown untuk melihat detail.
                    </p>
                  )
                })()}
                <p style={{ fontSize: 10, color: '#8C7B6B', marginTop: 16, fontStyle: 'italic', marginBottom: 0 }}>
                  Pakai dropdown di atas untuk navigasi wilayah Kec → Desa → SLS.
                </p>
              </>
            )

            const panelStyle: React.CSSProperties = {
              background: 'rgba(255,255,255,.82)',
              backdropFilter: 'blur(18px) saturate(160%)',
              WebkitBackdropFilter: 'blur(18px) saturate(160%)',
              border: '1px solid rgba(255,255,255,.7)',
              borderRadius: 18,
              padding: 20,
              boxShadow: '0 12px 40px rgba(232,117,26,.12), 0 2px 8px rgba(0,0,0,.04)',
              display: 'flex', flexDirection: 'column',
            }

            // Mobile: [dropdown di atas] → [peta] → [detail di bawah].
            // Desktop: [peta kiri] + [panel kanan: dropdown + detail].
            if (isMobile) {
              return (
                <>
                  <div style={panelStyle}>{filterControls}</div>
                  {mapEl}
                  <div style={panelStyle}>{detailContent}</div>
                </>
              )
            }
            return (
              <>
                {mapEl}
                <div style={{ ...panelStyle, marginTop: 66 }}>
                  {filterControls}
                  {detailContent}
                </div>
              </>
            )
          })()}
        </motion.div>

        {/* ── CTA bottom ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          style={{ textAlign: 'center', marginTop: 32 }}
        >
          <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-block' }}>
            <Link href="/se/2026/progress" style={{
              padding: '14px 28px',
              borderRadius: 99,
              background: 'linear-gradient(135deg,#E8751A,#F5A623)',
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(232,117,26,.40)',
              display: 'inline-flex', alignItems: 'center', gap: 10,
            }}>
              <span>🗺️</span>
              Lihat Peta & Data Lengkap
              <span aria-hidden>›</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .prog-grid-2 { grid-template-columns: 1fr !important; gap: 20px !important; }
          .prog-map-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .stats-strip { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 480px) {
          .stats-strip { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
