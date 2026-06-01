'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { mockProgress, mockStats } from '@/lib/mockData'
import WaveLoop from '@/components/decor/WaveLoop'
import KecamatanTooltip from '@/components/KecamatanTooltip'
import { withBase } from '@/lib/basePath'
import { useIsMobile } from '@/hooks/useIsMobile'

const MapKecamatan = dynamic(() => import('@/components/MapKecamatan'), {
  ssr: false,
  loading: () => <MapLoader />,
})
const MapDesa = dynamic(() => import('@/components/MapDesa'), {
  ssr: false,
  loading: () => <MapLoader />,
})
const MapSls = dynamic(() => import('@/components/MapSls'), {
  ssr: false,
  loading: () => <MapLoader />,
})

type Skala = '' | 'UMK' | 'UM' | 'UB'
type SortKey = 'kecamatan' | 'target_usaha' | 'realisasi' | 'persentase'

const mobSelectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #EDE3D8',
  background: 'white', fontSize: 13, fontWeight: 700, color: '#3D3D3D',
  cursor: 'pointer', outline: 'none',
}

const SKALA_OPTS: { v: Skala; label: string; color: string }[] = [
  { v: '',    label: 'Semua Skala', color: '#6B6B6B' },
  { v: 'UMK', label: 'Mikro & Kecil (UMK)', color: '#00A651' },
  { v: 'UM',  label: 'Menengah (UM)',      color: '#1877F2' },
  { v: 'UB',  label: 'Besar (UB)',          color: '#E8192C' },
]

export default function ProgressPage() {
  const [skala, setSkala] = useState<Skala>('')
  const [progress, setProgress] = useState<any[]>(mockProgress)
  const [stats, setStats] = useState<any>(mockStats)
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null)
  const [drilledKec, setDrilledKec] = useState<{ kdkec: string; nmkec: string } | null>(null)
  const [drilledDesa, setDrilledDesa] = useState<{ iddesa: string; nmdesa: string } | null>(null)
  const isMobile = useIsMobile()

  // Mobile filter state
  const [mobKec, setMobKec] = useState<{ kdkec: string; nmkec: string } | null>(null)
  const [mobDesa, setMobDesa] = useState<{ iddesa: string; nmdesa: string } | null>(null)
  const [mobSls, setMobSls] = useState<{ idsls: string; nmsls: string } | null>(null)
  const [desaOptions, setDesaOptions] = useState<any[]>([])
  const [slsOptions, setSlsOptions] = useState<any[]>([])

  useEffect(() => {
    const kec = isMobile ? mobKec : drilledKec
    if (!kec) { setDesaOptions([]); return }
    fetch(`/api/progress/desa?kec=${encodeURIComponent(kec.kdkec)}${skala ? `&skala=${skala}` : ''}`)
      .then(r => r.json()).then(j => setDesaOptions((j.data ?? []).map((d: any) => ({
        iddesa: `${d.kdkec}${d.kddesa}`,
        nmdesa: d.nmdesa,
        target: Number(d.target_usaha ?? 0),
        realisasi: Number(d.realisasi ?? 0),
        persentase: Number(d.persentase ?? 0),
        breakdown: d.breakdown ?? null,
      })))).catch(() => setDesaOptions([]))
  }, [isMobile ? mobKec?.kdkec : drilledKec?.kdkec, skala])

  useEffect(() => {
    const desa = isMobile ? mobDesa : drilledDesa
    if (!desa) { setSlsOptions([]); return }
    fetch(`/api/progress/sls?desa=${encodeURIComponent(desa.iddesa)}${skala ? `&skala=${skala}` : ''}`)
      .then(r => r.json()).then(j => setSlsOptions(j.data ?? [])).catch(() => setSlsOptions([]))
  }, [isMobile ? mobDesa?.iddesa : drilledDesa?.iddesa, skala])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('persentase')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Load geojson once
  useEffect(() => {
    fetch(withBase('/geo/musirawas_kec.geojson'))
      .then(r => r.json()).then(setGeoJson).catch(console.error)
  }, [])

  // Load progress + stats when skala filter changes
  useEffect(() => {
    const url = `/api/progress${skala ? `?skala=${skala}` : ''}`
    fetch(url).then(r => r.json()).then(j => setProgress(j.data ?? []))
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [skala])

  const filtered = progress
    .filter((k: any) => (k.nmkec ?? k.kecamatan ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const mult = sortDir === 'desc' ? -1 : 1
      const av = a[sortBy] ?? a.kecamatan ?? a.nmkec
      const bv = b[sortBy] ?? b.kecamatan ?? b.nmkec
      return mult * (av < bv ? -1 : av > bv ? 1 : 0)
    })

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const exportCsv = () => {
    const rows = [
      'Kecamatan,Target,Realisasi,Persentase,Status',
      ...progress.map((k: any) => `${k.nmkec ?? k.kecamatan},${k.target_usaha},${k.realisasi},${k.persentase}%,${k.status}`),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `progress-se2026${skala ? `-${skala}` : ''}.csv`; a.click()
  }

  return (
    <>
      {/* Hero */}
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', padding: '56px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 16px)' }} />
        <WaveLoop position="top-right" size={380} opacity={0.22} variant="ribbon" />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span><span style={{ color: 'white' }}>Progress Pencacahan</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'white', marginBottom: 20 }}>Peta Progress SE2026</h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Target', val: (stats.total_target ?? 0).toLocaleString('id-ID') + ' usaha', icon: '🏪' },
              { label: 'Terealisasi', val: (stats.total_realisasi ?? 0).toLocaleString('id-ID') + ' usaha', icon: '✅' },
              { label: 'Progress',    val: (stats.persentase ?? 0) + '%',     icon: '📊' },
              { label: 'Hari Tersisa', val: (stats.hari_tersisa ?? 0) + ' hari', icon: '⏳' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(0,0,0,.15)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,255,255,.15)' }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 1440 80" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#FAF8F5" />
        </svg>
      </section>

      <section style={{ background: '#FAF8F5', padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* Filter skala — segmented control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3D3D3D', textTransform: 'uppercase' as const, letterSpacing: .5 }}>Filter Skala:</span>
            <div style={{ display: 'flex', background: 'white', borderRadius: 99, padding: 4, border: '1px solid #EDE3D8', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
              {SKALA_OPTS.map(opt => (
                <button key={opt.v}
                  onClick={() => setSkala(opt.v)}
                  style={{
                    padding: '8px 16px', borderRadius: 99,
                    background: skala === opt.v ? opt.color : 'transparent',
                    color: skala === opt.v ? 'white' : '#3D3D3D',
                    border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >{opt.label}</button>
              ))}
            </div>
            {drilledKec && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#E8751A', fontWeight: 700 }}>
                🔍 Drill-down: {drilledKec.nmkec}
                {drilledDesa && <> › <span style={{ color: '#C85E0A' }}>Desa {drilledDesa.nmdesa}</span></>}
              </span>
            )}
          </div>

          {/* Mobile-only: dropdown filter wilayah + info panel (klik peta tidak drill di mobile) */}
          {isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, padding: 14, background: 'white', borderRadius: 12, border: '1px solid #EDE3D8' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8C7B6B', textTransform: 'uppercase', letterSpacing: .5 }}>Filter Wilayah</div>
              <select
                value={mobKec?.kdkec ?? ''}
                onChange={e => {
                  const v = e.target.value
                  setMobDesa(null); setMobSls(null)
                  if (!v) { setMobKec(null); return }
                  const found = progress.find((k: any) => String(k.kdkec ?? '') === v)
                  if (found) setMobKec({ kdkec: v, nmkec: found.nmkec ?? found.kecamatan })
                }}
                style={mobSelectStyle}
              >
                <option value="">— pilih kecamatan —</option>
                {(progress as any[]).filter((k: any) => k.kdkec).map((k: any) => (
                  <option key={k.kdkec} value={k.kdkec}>{k.nmkec ?? k.kecamatan}</option>
                ))}
              </select>

              {mobKec && desaOptions.length > 0 && (
                <select
                  value={mobDesa?.iddesa ?? ''}
                  onChange={e => {
                    const v = e.target.value
                    setMobSls(null)
                    if (!v) { setMobDesa(null); return }
                    const opt = desaOptions.find((o: any) => o.iddesa === v)
                    if (opt) setMobDesa({ iddesa: opt.iddesa, nmdesa: opt.nmdesa })
                  }}
                  style={mobSelectStyle}
                >
                  <option value="">— pilih desa —</option>
                  {desaOptions.map((o: any) => (
                    <option key={o.iddesa} value={o.iddesa}>{o.nmdesa}</option>
                  ))}
                </select>
              )}

              {mobDesa && slsOptions.length > 0 && (
                <select
                  value={mobSls?.idsls ?? ''}
                  onChange={e => {
                    const v = e.target.value
                    if (!v) { setMobSls(null); return }
                    const opt = slsOptions.find((o: any) => o.idsls === v)
                    if (opt) setMobSls({ idsls: opt.idsls, nmsls: opt.nmsls })
                  }}
                  style={mobSelectStyle}
                >
                  <option value="">— pilih SLS —</option>
                  {slsOptions.map((o: any) => (
                    <option key={o.idsls} value={o.idsls}>SLS {o.nmsls || o.idsls.slice(-4)}</option>
                  ))}
                </select>
              )}

              {/* Info panel mobile — info wilayah terdalam yang dipilih */}
              {(() => {
                let info: any = null
                let label = ''
                if (mobSls) {
                  const s = slsOptions.find((o: any) => o.idsls === mobSls.idsls)
                  if (s) { info = { target: s.target_usaha, realisasi: s.realisasi, persentase: s.persentase, breakdown: s.breakdown }; label = `SLS ${s.nmsls || mobSls.idsls.slice(-4)}` }
                } else if (mobDesa) {
                  const d = desaOptions.find((o: any) => o.iddesa === mobDesa.iddesa)
                  if (d) { info = { target: d.target, realisasi: d.realisasi, persentase: d.persentase, breakdown: d.breakdown }; label = `Desa ${d.nmdesa}` }
                } else if (mobKec) {
                  const k: any = progress.find((p: any) => String(p.kdkec ?? '') === mobKec.kdkec)
                  if (k) { info = { target: k.target_usaha, realisasi: k.realisasi, persentase: k.persentase, breakdown: k.breakdown }; label = k.nmkec ?? k.kecamatan }
                }
                if (!info) return (
                  <p style={{ fontSize: 12, color: '#8C7B6B', fontStyle: 'italic', margin: 0 }}>
                    Pilih kecamatan/desa/SLS di atas untuk melihat info pencacahan.
                  </p>
                )
                return (
                  <div style={{ paddingTop: 8, borderTop: '1px dashed #EDE3D8' }}>
                    <KecamatanTooltip
                      nama={label}
                      target={info.target}
                      realisasi={info.realisasi}
                      persentase={info.persentase}
                      breakdown={info.breakdown ?? undefined}
                      skalaFilter={skala}
                    />
                    <div style={{ marginTop: 10, height: 8, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${info.persentase}%`, borderRadius: 99, background: 'linear-gradient(90deg, #E8751A, #F5A623)' }} />
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Map + Ranking */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 32, marginBottom: 40 }} className="map-layout">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 16 }}>
                {drilledDesa
                  ? `Peta SLS — Desa ${drilledDesa.nmdesa}`
                  : drilledKec
                    ? `Peta Desa — Kec. ${drilledKec.nmkec}`
                    : 'Peta Choropleth — Klik kecamatan untuk drill-down'}
              </h2>
              <div style={{ position: 'relative' }}>
                {drilledDesa ? (
                  <MapSls
                    iddesa={drilledDesa.iddesa}
                    nmdesa={drilledDesa.nmdesa}
                    nmkec={drilledKec?.nmkec}
                    skala={skala}
                    onBack={() => setDrilledDesa(null)}
                  />
                ) : drilledKec ? (
                  <MapDesa
                    kdkec={drilledKec.kdkec}
                    nmkec={drilledKec.nmkec}
                    skala={skala}
                    onBack={() => { setDrilledKec(null); setDrilledDesa(null) }}
                    onDesaClick={(iddesa, nmdesa) => {
                      setMobDesa({ iddesa, nmdesa }); setMobSls(null)
                      if (!isMobile) setDrilledDesa({ iddesa, nmdesa })
                    }}
                  />
                ) : geoJson ? (
                  <MapKecamatan
                    data={progress}
                    geoJson={geoJson}
                    onKecClick={(kdkec, nmkec) => {
                      setMobKec({ kdkec, nmkec }); setMobDesa(null); setMobSls(null)
                      if (!isMobile) setDrilledKec({ kdkec, nmkec })
                    }}
                    skalaFilter={skala}
                  />
                ) : <MapLoader />}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Ranking Kecamatan</h2>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari…" style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 13, width: 120, outline: 'none' }} />
              </div>
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'hidden', maxHeight: 480, overflowY: 'auto' }}>
                {filtered.sort((a: any, b: any) => b.persentase - a.persentase).map((k: any, i: number) => (
                  <button key={k.id ?? k.kdkec ?? k.kecamatan}
                    onClick={() => k.kdkec && setDrilledKec({ kdkec: k.kdkec, nmkec: k.nmkec ?? k.kecamatan })}
                    style={{ width: '100%', padding: '12px 16px', borderBottom: '1px solid #EDE3D8', display: 'flex', flexDirection: 'column', gap: 6, background: 'none', border: 'none', cursor: k.kdkec ? 'pointer' : 'default', textAlign: 'left' as const }}
                    className="rank-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: i < 3 ? '#E8751A' : '#F5EDE0', color: i < 3 ? 'white' : '#6B6B6B', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>{k.nmkec ?? k.kecamatan}</div>
                        <div style={{ height: 6, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#E8751A', width: `${k.persentase}%`, borderRadius: 99, transition: 'width .6s ease' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#E8751A', flexShrink: 0 }}>{k.persentase}%</span>
                    </div>
                    {!skala && k.breakdown && (
                      <div style={{ display: 'flex', gap: 6, paddingLeft: 36, fontSize: 10, fontWeight: 600 }}>
                        <span style={{ color: '#00A651' }}>UMK {k.breakdown.UMK.realisasi}/{k.breakdown.UMK.target}</span>
                        <span style={{ color: '#8C7B6B' }}>·</span>
                        <span style={{ color: '#1877F2' }}>UM {k.breakdown.UM.realisasi}/{k.breakdown.UM.target}</span>
                        <span style={{ color: '#8C7B6B' }}>·</span>
                        <span style={{ color: '#E8192C' }}>UB {k.breakdown.UB.realisasi}/{k.breakdown.UB.target}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabel detail */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(232,117,26,.07)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
                Rekap Pencacahan{skala ? ` — Skala ${skala}` : ''}
              </h3>
              <button onClick={exportCsv} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', color: '#E8751A', border: '1.5px solid #E8751A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇ Export CSV</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FDF6EE' }}>
                    {[
                      { key: 'kecamatan' as const, label: 'Kecamatan' },
                      { key: 'target_usaha' as const, label: 'Target' },
                      { key: 'realisasi' as const, label: 'Realisasi' },
                      ...(!skala ? [
                        { key: null, label: 'UMK' },
                        { key: null, label: 'UM' },
                        { key: null, label: 'UB' },
                      ] : []),
                      { key: 'persentase' as const, label: 'Progress' },
                      { key: null, label: 'Status' },
                    ].map(col => (
                      <th key={col.label} onClick={() => col.key && handleSort(col.key as SortKey)}
                          style={{ padding: '12px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5, borderBottom: '1px solid #EDE3D8', cursor: col.key ? 'pointer' : 'default', whiteSpace: 'nowrap' as const }}>
                        {col.label} {col.key === sortBy ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((k: any, i: number) => (
                    <tr key={k.id ?? k.kdkec ?? k.kecamatan} style={{ background: i % 2 === 1 ? '#FAFAFA' : 'white' }} className="tbl-row">
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{k.nmkec ?? k.kecamatan}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#3D3D3D' }}>{k.target_usaha.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#3D3D3D' }}>{k.realisasi.toLocaleString('id-ID')}</td>
                      {!skala && k.breakdown && (
                        <>
                          <td style={{ padding: '12px 14px', fontSize: 12 }}>
                            <span style={{ color: '#00A651', fontWeight: 700 }}>{k.breakdown.UMK.realisasi}</span>
                            <span style={{ color: '#8C7B6B' }}>/{k.breakdown.UMK.target}</span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12 }}>
                            <span style={{ color: '#1877F2', fontWeight: 700 }}>{k.breakdown.UM.realisasi}</span>
                            <span style={{ color: '#8C7B6B' }}>/{k.breakdown.UM.target}</span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12 }}>
                            <span style={{ color: '#E8192C', fontWeight: 700 }}>{k.breakdown.UB.realisasi}</span>
                            <span style={{ color: '#8C7B6B' }}>/{k.breakdown.UB.target}</span>
                          </td>
                        </>
                      )}
                      {!skala && !k.breakdown && <><td>—</td><td>—</td><td>—</td></>}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ height: '100%', background: '#E8751A', width: `${k.persentase}%`, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#E8751A', minWidth: 34 }}>{k.persentase}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                          background: k.status === 'selesai' ? '#E8FFF3' : k.status === 'berlangsung' ? '#FFF0DC' : '#F5F5F5',
                          color: k.status === 'selesai' ? '#00A651' : k.status === 'berlangsung' ? '#E8751A' : '#6B6B6B',
                        }}>
                          {k.status === 'berlangsung' ? 'Berlangsung' : k.status === 'selesai' ? 'Selesai' : 'Belum'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .tbl-row:hover { background: #FFF0DC !important; }
        .rank-row:hover { background: #FFF0DC !important; }
        @media (max-width: 900px) {
          .map-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

function MapLoader() {
  return (
    <div style={{ height: 480, borderRadius: 14, background: '#F5EDE0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EDE3D8' }}>
      <div style={{ textAlign: 'center', color: '#6B6B6B' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
        <p style={{ fontSize: 13 }}>Memuat peta…</p>
      </div>
    </div>
  )
}
