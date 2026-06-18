'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { mockProgress, mockStats } from '@/lib/mockData'
import WaveLoop from '@/components/decor/WaveLoop'
import KecamatanTooltip from '@/components/KecamatanTooltip'
import LiveUpdateBadge from '@/components/LiveUpdateBadge'
import { withBase } from '@/lib/basePath'
import { useIsMobile } from '@/hooks/useIsMobile'
import { exportCsv as exportCsvFile, exportTablePng } from '@/lib/exportTable'

const PetugasHarianSection = dynamic(() => import('@/components/PetugasHarianSection'), { ssr: false })
const PetugasMiniHarianModal = dynamic(() => import('@/components/PetugasMiniHarianModal'), { ssr: false })

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
const exBtn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E8751A', background: 'transparent',
  color: '#E8751A', fontSize: 12, fontWeight: 700, cursor: 'pointer',
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
  // Info SLS terpilih lewat dropdown (info-only di mobile)
  const [selectedSls, setSelectedSls] = useState<{ idsls: string; nmsls: string } | null>(null)
  const isMobile = useIsMobile()

  // Progress per petugas (public, tanpa email) + realtime
  const [petugas, setPetugas] = useState<any[]>([])
  const [petugasKec, setPetugasKec] = useState('')
  const [petugasKecList, setPetugasKecList] = useState<any[]>([])
  const [petugasQ, setPetugasQ] = useState('')
  const [petugasPml, setPetugasPml] = useState('')
  const [miniPetugas, setMiniPetugas] = useState<{ kec: string; nama: string; nmkec: string } | null>(null)

  const pmlList = [...new Set(petugas.map((p: any) => p.nama_pml).filter(Boolean))].sort()
  const filteredPetugas = petugas.filter((p: any) =>
    (!petugasPml || p.nama_pml === petugasPml) &&
    (!petugasQ || (p.nama_ppl ?? '').toLowerCase().includes(petugasQ.toLowerCase()) || (p.nama_pml ?? '').toLowerCase().includes(petugasQ.toLowerCase())))

  function exportPetugasCsv() {
    const headers = ['No', 'Petugas (PPL)', 'Pengawas (PML)', ...(petugasKec ? ['Kecamatan'] : []), 'Target', 'Draft', 'Selesai Cacah', 'Approved', 'Progress %']
    const rows = filteredPetugas.map((p: any, i: number) => [i + 1, p.nama_ppl, p.nama_pml, ...(petugasKec ? [p.nmkec] : []), p.total, p.draft ?? 0, p.selesai_cacah, p.selesai_approve, p.pct_cacah.toFixed(1)])
    const kecLbl = petugasKecList.find((k: any) => k.kode_kec === petugasKec)?.nmkec
    exportCsvFile(`progress-petugas${kecLbl ? '-' + kecLbl : ''}.csv`, headers, rows as any)
  }
  function exportPetugasPng() {
    const num = (v: number) => Number(v).toLocaleString('id-ID')
    const kecLbl = petugasKecList.find((k: any) => k.kode_kec === petugasKec)?.nmkec
    const cols = [
      { label: 'No', width: 40, align: 'right' as const },
      { label: 'Petugas (PPL)', width: 200 },
      { label: 'Pengawas (PML)', width: 170 },
      ...(petugasKec ? [{ label: 'Kecamatan', width: 150 }] : []),
      { label: 'Target', width: 70, align: 'right' as const },
      { label: 'Draft', width: 60, align: 'right' as const, color: () => '#1877F2' },
      { label: 'Cacah', width: 70, align: 'right' as const, color: () => '#C85E0A' },
      { label: 'Approved', width: 80, align: 'right' as const, color: () => '#00A651' },
      { label: 'Progress', width: 80, align: 'right' as const },
    ]
    const rows = filteredPetugas.map((p: any, i: number) => ({ ...p, _no: i + 1 }))
    exportTablePng({
      filename: `progress-petugas${kecLbl ? '-' + kecLbl : ''}.png`,
      title: 'Progress Petugas Pencacah SE2026',
      subtitle: `${kecLbl ? 'Kecamatan ' + kecLbl : 'Seluruh Kecamatan'} · ${filteredPetugas.length} petugas`,
      columns: cols,
      rows,
      cell: (p: any, ci: number) => {
        const base = petugasKec
          ? [String(p._no), p.nama_ppl, p.nama_pml, p.nmkec, num(p.total), num(p.draft ?? 0), num(p.selesai_cacah), num(p.selesai_approve), p.pct_cacah.toFixed(1) + '%']
          : [String(p._no), p.nama_ppl, p.nama_pml, num(p.total), num(p.draft ?? 0), num(p.selesai_cacah), num(p.selesai_approve), p.pct_cacah.toFixed(1) + '%']
        return base[ci]
      },
    })
  }

  const [desaOptions, setDesaOptions] = useState<any[]>([])
  const [slsOptions, setSlsOptions] = useState<any[]>([])

  // Fetch desa options saat kec dipilih.
  useEffect(() => {
    if (!drilledKec) { setDesaOptions([]); return }
    fetch(`/api/progress/desa?kec=${encodeURIComponent(drilledKec.kdkec)}${skala ? `&skala=${skala}` : ''}`)
      .then(r => r.json()).then(j => setDesaOptions((j.data ?? []).map((d: any) => ({
        iddesa: d.iddesa ?? (String(d.kddesa ?? '').length >= 10 ? String(d.kddesa) : `${d.kdkec ?? ''}${d.kddesa ?? ''}`),
        nmdesa: d.nmdesa,
        target: Number(d.target_usaha ?? 0),
        realisasi: Number(d.realisasi ?? 0),
        persentase: Number(d.persentase ?? 0),
        breakdown: d.breakdown ?? null,
      })))).catch(() => setDesaOptions([]))
  }, [drilledKec?.kdkec, skala])

  useEffect(() => {
    if (!drilledDesa) { setSlsOptions([]); return }
    fetch(`/api/progress/sls?desa=${encodeURIComponent(drilledDesa.iddesa)}${skala ? `&skala=${skala}` : ''}`)
      .then(r => r.json()).then(j => setSlsOptions(j.data ?? [])).catch(() => setSlsOptions([]))
  }, [drilledDesa?.iddesa, skala])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('persentase')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Load geojson once
  useEffect(() => {
    fetch(withBase('/geo/musirawas_kec.geojson'))
      .then(r => r.json()).then(setGeoJson).catch(console.error)
  }, [])

  // Load progress + stats — realtime: refetch tiap 60 detik (sinkron dengan bot scraper)
  useEffect(() => {
    let stop = false
    const load = () => {
      fetch('/api/progress', { cache: 'no-store' }).then(r => r.json()).then(j => { if (!stop) setProgress(j.data ?? []) }).catch(() => {})
      fetch('/api/stats', { cache: 'no-store' }).then(r => r.json()).then(j => { if (!stop) setStats(j) }).catch(() => {})
    }
    load()
    const id = setInterval(load, 60000)
    return () => { stop = true; clearInterval(id) }
  }, [])

  // Progress per petugas (realtime + filter kecamatan)
  useEffect(() => {
    let stop = false
    const load = () => {
      fetch(`/api/progress/petugas${petugasKec ? `?kec=${encodeURIComponent(petugasKec)}` : ''}`, { cache: 'no-store' })
        .then(r => r.json()).then(j => { if (!stop) { setPetugas(j.petugas ?? []); setPetugasKecList(j.kecamatanList ?? []) } }).catch(() => {})
    }
    load()
    const id = setInterval(load, 60000)
    return () => { stop = true; clearInterval(id) }
  }, [petugasKec])

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
              { label: 'Total Assignment', val: (stats.total_target ?? 0).toLocaleString('id-ID'), icon: '🏪' },
              { label: 'Selesai Cacah', val: (stats.total_realisasi ?? 0).toLocaleString('id-ID'), icon: '✅' },
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

          {/* Filter skala UMK/UM/UB dinonaktifkan sementara — progress kini berbasis
              assignment Fasih (realtime). Indikator LIVE + drill-down breadcrumb. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFF0DC', border: '1px solid rgba(232,117,26,.2)', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#C85E0A' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8192C', display: 'inline-block', animation: 'liveDot 1.4s ease-in-out infinite' }} />
              LIVE · Progress assignment Fasih
            </span>
            <LiveUpdateBadge unix={stats.last_ingest_unix} label={stats.last_ingest_str} />
            {drilledKec && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#E8751A', fontWeight: 700 }}>
                🔍 Drill-down: {drilledKec.nmkec}
                {drilledDesa && <> › <span style={{ color: '#C85E0A' }}>Desa {drilledDesa.nmdesa}</span></>}
              </span>
            )}
          </div>

          {/* Mobile-only: dropdown filter wilayah — DRILL peta + info panel.
              Pilih kec → peta drill ke desa. Pilih desa → peta drill ke SLS. */}
          {isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, padding: 14, background: 'white', borderRadius: 12, border: '1px solid #EDE3D8' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8C7B6B', textTransform: 'uppercase', letterSpacing: .5 }}>Filter Wilayah</div>
              <select
                value={drilledKec?.kdkec ?? ''}
                onChange={e => {
                  const v = e.target.value
                  setDrilledDesa(null); setSelectedSls(null)
                  if (!v) { setDrilledKec(null); return }
                  const found = progress.find((k: any) => String(k.kdkec ?? '') === v)
                  if (found) setDrilledKec({ kdkec: v, nmkec: found.nmkec ?? found.kecamatan })
                }}
                style={mobSelectStyle}
              >
                <option value="">🗺️ semua kecamatan (peta kab.)</option>
                {(progress as any[]).filter((k: any) => k.kdkec).map((k: any) => (
                  <option key={k.kdkec} value={k.kdkec}>{k.nmkec ?? k.kecamatan} — lihat per desa</option>
                ))}
              </select>

              {drilledKec && desaOptions.length > 0 && (
                <select
                  value={drilledDesa?.iddesa ?? ''}
                  onChange={e => {
                    const v = e.target.value
                    setSelectedSls(null)
                    if (!v) { setDrilledDesa(null); return }
                    const opt = desaOptions.find((o: any) => o.iddesa === v)
                    if (opt) setDrilledDesa({ iddesa: opt.iddesa, nmdesa: opt.nmdesa })
                  }}
                  style={mobSelectStyle}
                >
                  <option value="">— semua desa (peta kec.) —</option>
                  {desaOptions.map((o: any) => (
                    <option key={o.iddesa} value={o.iddesa}>{o.nmdesa} — lihat per SLS</option>
                  ))}
                </select>
              )}

              {drilledDesa && slsOptions.length > 0 && (
                <select
                  value={selectedSls?.idsls ?? ''}
                  onChange={e => {
                    const v = e.target.value
                    if (!v) { setSelectedSls(null); return }
                    const opt = slsOptions.find((o: any) => o.idsls === v)
                    if (opt) setSelectedSls({ idsls: opt.idsls, nmsls: opt.nmsls })
                  }}
                  style={mobSelectStyle}
                >
                  <option value="">— pilih SLS untuk info —</option>
                  {slsOptions.map((o: any) => (
                    <option key={o.idsls} value={o.idsls}>SLS {o.nmsls || o.idsls.slice(-4)}</option>
                  ))}
                </select>
              )}

              <p style={{ fontSize: 11, color: '#8C7B6B', fontStyle: 'italic', margin: 0 }}>
                Pilih wilayah untuk drill-down peta. Detail muncul di bawah peta.
              </p>
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
                    onBack={() => { setDrilledKec(null); setDrilledDesa(null); setSelectedSls(null) }}
                    /* Desktop: klik desa drill ke MapSls. Mobile: klik = info-only, dropdown yang drill. */
                    onDesaClick={isMobile ? undefined : (iddesa, nmdesa) => setDrilledDesa({ iddesa, nmdesa })}
                  />
                ) : geoJson ? (
                  <MapKecamatan
                    data={progress}
                    geoJson={geoJson}
                    /* Desktop: klik kec drill ke MapDesa. Mobile: klik = info-only, dropdown yang drill. */
                    onKecClick={isMobile ? undefined : (kdkec, nmkec) => setDrilledKec({ kdkec, nmkec })}
                    skalaFilter={skala}
                  />
                ) : <MapLoader />}
              </div>

              {/* Mobile: detail wilayah terpilih DI BAWAH peta */}
              {isMobile && (() => {
                let info: any = null
                let label = ''
                if (selectedSls) {
                  const s = slsOptions.find((o: any) => o.idsls === selectedSls.idsls)
                  if (s) { info = { target: s.target_usaha, realisasi: s.realisasi, persentase: s.persentase, breakdown: s.breakdown, fasih: (s as any).fasih }; label = `SLS ${s.nmsls || selectedSls.idsls.slice(-4)}` }
                } else if (drilledDesa) {
                  const d = desaOptions.find((o: any) => o.iddesa === drilledDesa.iddesa)
                  if (d) { info = { target: d.target, realisasi: d.realisasi, persentase: d.persentase, breakdown: d.breakdown, fasih: (d as any).fasih }; label = `Desa ${d.nmdesa}` }
                } else if (drilledKec) {
                  const k: any = progress.find((p: any) => String(p.kdkec ?? '') === drilledKec.kdkec)
                  if (k) { info = { target: k.target_usaha, realisasi: k.realisasi, persentase: k.persentase, breakdown: k.breakdown, fasih: (k as any).fasih }; label = k.nmkec ?? k.kecamatan }
                }
                return (
                  <div style={{ marginTop: 14, padding: 16, background: 'white', borderRadius: 12, border: '1px solid #EDE3D8' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase' as const, letterSpacing: .5, marginBottom: 10 }}>Detail Wilayah</div>
                    {info ? (
                      <>
                        <KecamatanTooltip nama={label} target={info.target} realisasi={info.realisasi} persentase={info.persentase} breakdown={info.breakdown ?? undefined} fasih={info.fasih ?? undefined} skalaFilter={skala} />
                        <div style={{ marginTop: 10, height: 8, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${info.persentase}%`, borderRadius: 99, background: 'linear-gradient(90deg, #E8751A, #F5A623)' }} />
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: 12, color: '#8C7B6B', fontStyle: 'italic', margin: 0 }}>Pilih wilayah di filter atas untuk melihat detail UMK/UM/UB & target.</p>
                    )}
                  </div>
                )
              })()}
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
                    {k.fasih ? (
                      <div style={{ display: 'flex', gap: 8, paddingLeft: 36, fontSize: 10, fontWeight: 600 }}>
                        <span style={{ color: '#C85E0A' }}>Cacah {k.realisasi.toLocaleString('id-ID')}/{k.target_usaha.toLocaleString('id-ID')}</span>
                        <span style={{ color: '#8C7B6B' }}>·</span>
                        <span style={{ color: '#00A651' }}>Approved {k.fasih.selesai_approve.toLocaleString('id-ID')}</span>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabel detail */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(232,117,26,.07)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
                Rekap Progress per Kecamatan
              </h3>
              <button onClick={exportCsv} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', color: '#E8751A', border: '1.5px solid #E8751A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇ Export CSV</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FDF6EE' }}>
                    {[
                      { key: 'kecamatan' as const, label: 'Kecamatan' },
                      { key: 'target_usaha' as const, label: 'Target Assignment' },
                      { key: null, label: 'Draft' },
                      { key: 'realisasi' as const, label: 'Selesai Cacah' },
                      { key: null, label: 'Approved' },
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
                      <td style={{ padding: '12px 14px', fontSize: 13 }} title="Sudah dicacah tapi belum disubmit (tidak dihitung selesai)">
                        <span style={{ color: '#1877F2', fontWeight: 700 }}>{(k.fasih?.draft ?? 0).toLocaleString('id-ID')}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#3D3D3D' }}>{k.realisasi.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>
                        <span style={{ color: '#00A651', fontWeight: 700 }}>{(k.fasih?.selesai_approve ?? 0).toLocaleString('id-ID')}</span>
                        {k.fasih && <span style={{ color: '#8C7B6B', fontSize: 11 }}> ({k.fasih.pct_approve.toFixed(1)}%)</span>}
                      </td>
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

          {/* ── Tabel Progress Petugas ── */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(232,117,26,.07)', marginTop: 32 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Progress Petugas Pencacah (PPL)</h3>
                <p style={{ fontSize: 12, color: '#8C7B6B', margin: '4px 0 0' }}>Realisasi pencacahan per petugas lapangan — diperbarui realtime.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={petugasKec} onChange={e => setPetugasKec(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 12, fontWeight: 700, color: '#3D3D3D', outline: 'none', background: 'white' }}>
                  <option value="">🗺️ Semua Kecamatan</option>
                  {petugasKecList.map((k: any) => <option key={k.kode_kec} value={k.kode_kec}>{k.nmkec}</option>)}
                </select>
                <select value={petugasPml} onChange={e => setPetugasPml(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 12, fontWeight: 700, color: '#3D3D3D', outline: 'none', background: 'white', maxWidth: 180 }} title="Filter per Pengawas (PML)">
                  <option value="">🧑‍💼 Semua PML</option>
                  {pmlList.map((nm: any) => <option key={nm} value={nm}>{nm}</option>)}
                </select>
                <input value={petugasQ} onChange={e => setPetugasQ(e.target.value)} placeholder="Cari nama…" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 13, outline: 'none', width: 130 }} />
                <button onClick={exportPetugasCsv} disabled={!filteredPetugas.length} style={exBtn}>⬇ CSV</button>
                <button onClick={exportPetugasPng} disabled={!filteredPetugas.length} style={exBtn}>🖼️ PNG</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FDF6EE', position: 'sticky', top: 0 }}>
                    {['#', 'Petugas (PPL)', 'Pengawas (PML)', petugasKec ? 'Kecamatan' : '', 'Target', 'Draft', 'Selesai Cacah', 'Approved', 'Progress', 'Aksi'].filter(Boolean).map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5, borderBottom: '1px solid #EDE3D8', whiteSpace: 'nowrap' as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPetugas.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#8C7B6B', fontSize: 13 }}>Belum ada data petugas dari Fasih. Akan muncul setelah bot scraper mengirim update.</td></tr>
                  )}
                  {filteredPetugas.map((p: any, i: number) => (
                    <tr key={(p.nama_ppl ?? '') + i} style={{ background: i % 2 ? '#FAFAFA' : 'white' }} className="tbl-row">
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#8C7B6B' }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{p.nama_ppl}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B6B' }}>{p.nama_pml}</td>
                      {petugasKec && <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B6B' }}>{p.nmkec}</td>}
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#3D3D3D' }}>{p.total.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#1877F2', fontWeight: 700 }} title="Sudah dicacah belum disubmit (tidak dihitung selesai)">{(p.draft ?? 0).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#C85E0A' }}>{p.selesai_cacah.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#00A651', fontWeight: 700 }}>{p.selesai_approve.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', minWidth: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden', minWidth: 50 }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg,#E8751A,#F5A623)', width: `${Math.min(p.pct_cacah, 100)}%`, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#E8751A', minWidth: 38 }}>{p.pct_cacah.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => setMiniPetugas({ kec: petugasKec, nama: p.nama_ppl, nmkec: petugasKecList.find((k: any) => k.kode_kec === petugasKec)?.nmkec ?? p.nmkec ?? '' })}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #EDE3D8', background: 'white', color: '#C85E0A', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          title="Lihat grafik progress harian petugas ini"
                        >📈 Harian</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Performa Harian (grafik + tabel) ── */}
          <PetugasHarianSection />
        </div>
      </section>

      {/* Popup grafik harian per petugas (independen) */}
      {miniPetugas && (
        <PetugasMiniHarianModal kec={miniPetugas.kec} nama={miniPetugas.nama} nmkec={miniPetugas.nmkec} onClose={() => setMiniPetugas(null)} />
      )}

      <style>{`
        .tbl-row:hover { background: #FFF0DC !important; }
        .rank-row:hover { background: #FFF0DC !important; }
        @keyframes liveDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(1.4); } }
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
