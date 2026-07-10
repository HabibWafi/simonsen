'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import WaveLoop from '@/components/decor/WaveLoop'
import KecamatanTooltip from '@/components/KecamatanTooltip'
import StatusDonut from '@/components/StatusDonut'
import LiveUpdateBadge from '@/components/LiveUpdateBadge'
import { withBase } from '@/lib/basePath'
import { useIsMobile } from '@/hooks/useIsMobile'
import { exportCsv as exportCsvFile, exportTablePng } from '@/lib/exportTable'
import { loadKecGeo, getCachedKecGeo } from '@/lib/geoCache'

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
type SortKey = 'kecamatan' | 'target_usaha' | 'draft' | 'realisasi' | 'submitted' | 'rejected' | 'revoked' | 'edited_pengawas' | 'approved' | 'persentase' | 'status'

function rekapSortVal(k: any, key: SortKey): string | number {
  switch (key) {
    case 'kecamatan':      return (k.nmkec ?? k.kecamatan ?? '').toLowerCase()
    case 'draft':          return Number(k.fasih?.draft ?? 0)
    case 'submitted':      return Number(k.fasih?.submitted ?? 0) + Number(k.fasih?.submitted_responden ?? 0)
    case 'rejected':       return Number(k.fasih?.rejected ?? 0)
    case 'revoked':        return Number(k.fasih?.revoked ?? 0)
    case 'edited_pengawas': return Number(k.fasih?.edited_pengawas ?? 0)
    case 'approved':       return Number(k.fasih?.selesai_approve ?? 0)
    case 'status':         return String(k.status ?? '')
    default:               return Number(k[key] ?? 0)
  }
}

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
  const [progress, setProgress] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(getCachedKecGeo())
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
  const [petugasWeek, setPetugasWeek] = useState('')        // '' = Seluruh Waktu; else start ISO minggu
  const [petugasWeeks, setPetugasWeeks] = useState<any[]>([]) // daftar bucket minggu dari API
  const [petugasWeekInfo, setPetugasWeekInfo] = useState<any>(null) // {n,start,end,label} saat mode minggu
  const [miniPetugas, setMiniPetugas] = useState<{ kec: string; nama: string; nmkec: string } | null>(null)
  const [pgSort, setPgSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'selesai_cacah', dir: 'desc' })

  // Monitoring pengawas (PML) — publik, tanpa email
  const [pengawas, setPengawas] = useState<any[]>([])
  const [pengawasKec, setPengawasKec] = useState('')
  const [pengawasKecList, setPengawasKecList] = useState<any[]>([])
  const [pengawasQ, setPengawasQ] = useState('')
  const [pgwSort, setPgwSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'selesai_cacah', dir: 'desc' })
  const pgwSortVal = (p: any, key: string): string | number =>
    (key === 'nama_pml' || key === 'nmkec') ? String(p[key] ?? '').toLowerCase() : Number(p[key] ?? 0)
  const pgwClickSort = (key: string) => setPgwSort(s => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  const filteredPengawas = pengawas
    .filter((p: any) => !pengawasQ || (p.nama_pml ?? '').toLowerCase().includes(pengawasQ.toLowerCase()))
    .sort((a: any, b: any) => {
      const m = pgwSort.dir === 'desc' ? -1 : 1
      const av = pgwSortVal(a, pgwSort.key), bv = pgwSortVal(b, pgwSort.key)
      return m * (av < bv ? -1 : av > bv ? 1 : 0)
    })
  function exportPengawasCsv() {
    const headers = ['No', 'Pengawas (PML)', 'Kecamatan', 'Jumlah PPL', 'Total Assignment', 'Submitted', 'Approved & Final', 'Rejected', 'Revoked', 'Edited Pengawas', 'Selesai Cacah', 'Progress %']
    const rows = filteredPengawas.map((p: any, i: number) => [i + 1, p.nama_pml, p.nmkec, p.jumlah_ppl, p.jumlah_unit, p.submitted, p.approved, p.rejected, p.revoked, p.edited_pengawas, p.selesai_cacah, p.pct_cacah.toFixed(1)])
    exportCsvFile(`monitoring-pengawas${pengawasKec ? '-' + (pengawasKecList.find((k: any) => k.kode_kec === pengawasKec)?.nmkec ?? '') : ''}.csv`, headers, rows as any)
  }
  function exportPengawasPng() {
    const num = (v: number) => Number(v).toLocaleString('id-ID')
    const kecLbl = pengawasKecList.find((k: any) => k.kode_kec === pengawasKec)?.nmkec
    const cols = [
      { label: 'No', width: 40, align: 'right' as const },
      { label: 'Pengawas (PML)', width: 200 },
      { label: 'Kecamatan', width: 150 },
      { label: 'PPL', width: 55, align: 'right' as const },
      { label: 'Unit', width: 70, align: 'right' as const },
      { label: 'Submitted', width: 82, align: 'right' as const },
      { label: 'Approved', width: 82, align: 'right' as const, color: () => '#00A651' },
      { label: 'Rejected', width: 74, align: 'right' as const, color: () => '#E8192C' },
      { label: 'Edited PML', width: 82, align: 'right' as const, color: () => '#0EA5A4' },
      { label: 'Progress', width: 78, align: 'right' as const },
    ]
    const rows = filteredPengawas.map((p: any, i: number) => ({ ...p, _no: i + 1 }))
    exportTablePng({
      filename: `monitoring-pengawas${kecLbl ? '-' + kecLbl : ''}.png`,
      title: 'Monitoring Progress Pengawas (PML) SE2026',
      subtitle: `${kecLbl ? 'Kecamatan ' + kecLbl : 'Seluruh Kecamatan'} · ${filteredPengawas.length} pengawas`,
      columns: cols, rows,
      cell: (p: any, ci: number) => [String(p._no), p.nama_pml, p.nmkec, num(p.jumlah_ppl), num(p.jumlah_unit), num(p.submitted), num(p.approved), num(p.rejected), num(p.edited_pengawas), p.pct_cacah.toFixed(1) + '%'][ci],
    })
  }

  const pgSortVal = (p: any, key: string): string | number => {
    if (key === 'nama_ppl' || key === 'nama_pml' || key === 'nmkec') return String(p[key] ?? '').toLowerCase()
    return Number(p[key] ?? 0)
  }
  const pgClickSort = (key: string) => setPgSort(s => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })

  const pmlList = [...new Set(petugas.map((p: any) => p.nama_pml).filter(Boolean))].sort()
  const filteredPetugas = petugas
    .filter((p: any) =>
      (!petugasPml || p.nama_pml === petugasPml) &&
      (!petugasQ || (p.nama_ppl ?? '').toLowerCase().includes(petugasQ.toLowerCase()) || (p.nama_pml ?? '').toLowerCase().includes(petugasQ.toLowerCase())))
    .sort((a: any, b: any) => {
      const m = pgSort.dir === 'desc' ? -1 : 1
      const av = pgSortVal(a, pgSort.key), bv = pgSortVal(b, pgSort.key)
      return m * (av < bv ? -1 : av > bv ? 1 : 0)
    })

  // Mode minggu → tabel berfungsi sebagai PERINGKAT MINGGUAN.
  const isWeekMode = !!petugasWeek
  const isWeekRank = isWeekMode && pgSort.key === 'selesai_cacah' && pgSort.dir === 'desc'
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? null
  const petugasWeekLabel = petugasWeekInfo?.label ?? petugasWeeks.find((w: any) => w.start === petugasWeek)?.label ?? ''

  function exportPetugasCsv() {
    const headers = ['No', 'Petugas (PPL)', 'Pengawas (PML)', 'Kecamatan', 'Target', 'Draft', 'Selesai Cacah', 'Submitted', 'Rejected', 'Revoked', 'Edited Pengawas', 'Approved & Final', 'Progress %']
    const rows = filteredPetugas.map((p: any, i: number) => [i + 1, p.nama_ppl, p.nama_pml, p.nmkec, p.total, p.draft == null ? '—' : p.draft, p.selesai_cacah, p.submitted == null ? '—' : p.submitted, p.rejected == null ? '—' : p.rejected, p.revoked == null ? '—' : p.revoked, p.edited_pengawas == null ? '—' : p.edited_pengawas, p.selesai_approve, p.pct_cacah.toFixed(1)])
    const kecLbl = petugasKecList.find((k: any) => k.kode_kec === petugasKec)?.nmkec
    const periodTag = isWeekMode ? `-minggu${petugasWeekInfo?.n ?? ''}` : ''
    exportCsvFile(`progress-petugas${kecLbl ? '-' + kecLbl : ''}${periodTag}.csv`, headers, rows as any)
  }
  function exportPetugasPng() {
    const num = (v: number) => Number(v).toLocaleString('id-ID')
    const kecLbl = petugasKecList.find((k: any) => k.kode_kec === petugasKec)?.nmkec
    const cols = [
      { label: 'No', width: 40, align: 'right' as const },
      { label: 'Petugas (PPL)', width: 190 },
      { label: 'Pengawas (PML)', width: 160 },
      { label: 'Kecamatan', width: 140 },
      { label: 'Target', width: 66, align: 'right' as const },
      { label: 'Draft', width: 58, align: 'right' as const, color: () => '#1877F2' },
      { label: 'Cacah', width: 66, align: 'right' as const, color: () => '#C85E0A' },
      { label: 'Submitted', width: 78, align: 'right' as const },
      { label: 'Rejected', width: 68, align: 'right' as const, color: () => '#E8192C' },
      { label: 'Revoked', width: 68, align: 'right' as const, color: () => '#9333EA' },
      { label: 'Edited PML', width: 76, align: 'right' as const, color: () => '#0EA5A4' },
      { label: 'Approved', width: 78, align: 'right' as const, color: () => '#00A651' },
      { label: 'Progress', width: 76, align: 'right' as const },
    ]
    const rows = filteredPetugas.map((p: any, i: number) => ({ ...p, _no: i + 1 }))
    const periodTag = isWeekMode ? `-minggu${petugasWeekInfo?.n ?? ''}` : ''
    const draftCell = (p: any) => p.draft == null ? '—' : num(p.draft)
    exportTablePng({
      filename: `progress-petugas${kecLbl ? '-' + kecLbl : ''}${periodTag}.png`,
      title: isWeekMode ? `Peringkat Mingguan Petugas SE2026 — ${petugasWeekLabel}` : 'Progress Petugas Pencacah SE2026',
      subtitle: `${kecLbl ? 'Kecamatan ' + kecLbl : 'Seluruh Kecamatan'} · ${filteredPetugas.length} petugas${isWeekMode ? ' · progres minggu ini' : ''}`,
      columns: cols,
      rows,
      cell: (p: any, ci: number) => {
        const subCell = p.submitted == null ? '—' : num(p.submitted)
        const rejCell = p.rejected == null ? '—' : num(p.rejected)
        const revCell = p.revoked == null ? '—' : num(p.revoked)
        const edpCell = p.edited_pengawas == null ? '—' : num(p.edited_pengawas)
        const base = [String(p._no), p.nama_ppl, p.nama_pml, p.nmkec, num(p.total), draftCell(p), num(p.selesai_cacah), subCell, rejCell, revCell, edpCell, num(p.selesai_approve), p.pct_cacah.toFixed(1) + '%']
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

  // Load geojson sekali (module-cache → instan di kunjungan berikutnya, tidak nyangkut)
  useEffect(() => {
    if (geoJson) return
    loadKecGeo().then(g => { if (g) setGeoJson(g) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load progress + stats — realtime: refetch tiap 60 detik (sinkron dengan bot scraper)
  useEffect(() => {
    let stop = false
    const load = () => {
      fetch('/api/progress', { cache: 'no-store' }).then(r => r.json()).then(j => { if (!stop) { setProgress(j.data ?? []); setProgressLoaded(true) } }).catch(() => { if (!stop) setProgressLoaded(true) })
      fetch('/api/stats', { cache: 'no-store' }).then(r => r.json()).then(j => { if (!stop) setStats(j) }).catch(() => {})
    }
    load()
    const id = setInterval(load, 60000)
    return () => { stop = true; clearInterval(id) }
  }, [])

  // Progress per petugas (realtime + filter kecamatan + filter minggu)
  useEffect(() => {
    let stop = false
    const load = () => {
      const qs = new URLSearchParams()
      if (petugasKec) qs.set('kec', petugasKec)
      if (petugasWeek) qs.set('week', petugasWeek)
      fetch(`/api/progress/petugas${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' })
        .then(r => r.json()).then(j => {
          if (stop) return
          setPetugas(j.petugas ?? [])
          setPetugasKecList(j.kecamatanList ?? [])
          if (j.weeks) setPetugasWeeks(j.weeks)
          setPetugasWeekInfo(j.week ?? null)
        }).catch(() => {})
    }
    load()
    const id = setInterval(load, 60000)
    return () => { stop = true; clearInterval(id) }
  }, [petugasKec, petugasWeek])

  // Monitoring pengawas (realtime + filter kecamatan)
  useEffect(() => {
    let stop = false
    const load = () => {
      fetch(`/api/progress/pengawas${pengawasKec ? `?kec=${encodeURIComponent(pengawasKec)}` : ''}`, { cache: 'no-store' })
        .then(r => r.json()).then(j => { if (!stop) { setPengawas(j.pengawas ?? []); setPengawasKecList(j.kecamatanList ?? []) } }).catch(() => {})
    }
    load()
    const id = setInterval(load, 60000)
    return () => { stop = true; clearInterval(id) }
  }, [pengawasKec])

  const filtered = progress
    .filter((k: any) => (k.nmkec ?? k.kecamatan ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => {
      const mult = sortDir === 'desc' ? -1 : 1
      const av = rekapSortVal(a, sortBy), bv = rekapSortVal(b, sortBy)
      return mult * (av < bv ? -1 : av > bv ? 1 : 0)
    })

  // Agregat status se-kabupaten (selalu dari seluruh progress, bukan hasil search) untuk donut.
  // 7 bucket: approved = selesai_approve (approved + completed/edited admin), edited_pengawas terpisah.
  const kab = (() => {
    let open = 0, draft = 0, submitted = 0, approved = 0, rejected = 0, revoked = 0, editedPengawas = 0, total = 0, cacah = 0
    for (const k of progress) {
      total += Number(k.target_usaha) || 0
      cacah += Number(k.realisasi) || 0
      const f = k.fasih
      if (f) {
        open += Number(f.open) || 0
        draft += Number(f.draft) || 0
        submitted += (Number(f.submitted) || 0) + (Number(f.submitted_responden) || 0)
        approved += Number(f.selesai_approve) || 0
        rejected += Number(f.rejected) || 0
        revoked += Number(f.revoked) || 0
        editedPengawas += Number(f.edited_pengawas) || 0
      }
    }
    return { open, draft, submitted, approved, rejected, revoked, editedPengawas, total, cacah }
  })()
  const hasStatus = (kab.open + kab.draft + kab.submitted + kab.approved + kab.rejected + kab.revoked + kab.editedPengawas) > 0

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const exportCsv = () => {
    const rows = [
      'Kecamatan,Target,Draft,Selesai Cacah,Submitted,Rejected,Revoked,Edited Pengawas,Approved & Final,Persentase,Status',
      ...progress.map((k: any) => `${k.nmkec ?? k.kecamatan},${k.target_usaha},${k.fasih?.draft ?? 0},${k.realisasi},${(k.fasih?.submitted ?? 0) + (k.fasih?.submitted_responden ?? 0)},${k.fasih?.rejected ?? 0},${k.fasih?.revoked ?? 0},${k.fasih?.edited_pengawas ?? 0},${k.fasih?.selesai_approve ?? 0},${k.persentase}%,${k.status}`),
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
              { label: 'Total Assignment', val: stats ? (stats.total_target ?? 0).toLocaleString('id-ID') : '…', icon: '🏪' },
              { label: 'Selesai Cacah', val: stats ? (stats.total_realisasi ?? 0).toLocaleString('id-ID') : '…', icon: '✅' },
              { label: 'Progress',    val: stats ? (stats.persentase ?? 0) + '%' : '…',     icon: '📊' },
              { label: 'Hari Tersisa', val: stats ? (stats.hari_tersisa ?? 0) + ' hari' : '…', icon: '⏳' },
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
            {stats && <LiveUpdateBadge unix={stats.last_ingest_unix} label={stats.last_ingest_str} />}
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

            {/* Komposisi status — sejajar & setinggi peta. Ranking dipindah ke
                tabel Rekap di bawah (kolom Target/Cacah/Progress di-highlight). */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 16 }}>Komposisi Status Assignment</h2>
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                {!progressLoaded ? (
                  <div style={{ flex: 1, background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320, color: '#8C7B6B', fontSize: 13 }}><span className="spin" style={{ display: 'inline-block', marginRight: 8 }}>⏳</span>Memuat data…</div>
                ) : hasStatus ? (
                  <StatusDonut open={kab.open} draft={kab.draft} submitted={kab.submitted} approved={kab.approved} rejected={kab.rejected} revoked={kab.revoked} editedPengawas={kab.editedPengawas} total={kab.total} cacah={kab.cacah} />
                ) : (
                  <div style={{ flex: 1, background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320, color: '#8C7B6B', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: 24 }}>Komposisi status akan muncul setelah data Fasih masuk.</div>
                )}
              </div>
            </div>
          </div>

          {/* Tabel detail */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(232,117,26,.07)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                  Rekap &amp; Peringkat per Kecamatan
                </h3>
                <p style={{ fontSize: 11, color: '#8C7B6B', margin: '4px 0 0', maxWidth: 680 }}>
                  Klik judul kolom untuk urutkan (default: <strong style={{ color: '#E8751A' }}>Progress</strong> tertinggi = peringkat 1). <strong>Selesai Cacah</strong> = Submitted + <span style={{ color: '#E8192C' }}>Rejected</span> + <span style={{ color: '#9333EA' }}>Revoked</span> + <span style={{ color: '#0EA5A4' }}>Edited Pengawas</span> + <span style={{ color: '#00A651' }}>Approved &amp; Final</span> = Total − Open − Draft.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kecamatan…" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 13, width: 150, outline: 'none' }} />
                <button onClick={exportCsv} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', color: '#E8751A', border: '1.5px solid #E8751A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇ Export CSV</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FDF6EE' }}>
                    {[
                      { key: null, label: '#', hot: false },
                      { key: 'kecamatan', label: 'Kecamatan', hot: false },
                      { key: 'target_usaha', label: 'Target Assignment', hot: true },
                      { key: 'draft', label: 'Draft', hot: false },
                      { key: 'realisasi', label: 'Selesai Cacah', hot: true },
                      { key: 'submitted', label: 'Submitted', hot: false },
                      { key: 'rejected', label: 'Rejected', hot: false },
                      { key: 'revoked', label: 'Revoked', hot: false },
                      { key: 'edited_pengawas', label: 'Edited Pengawas', hot: false },
                      { key: 'approved', label: 'Approved & Final', hot: false },
                      { key: 'persentase', label: 'Progress', hot: true },
                      { key: 'status', label: 'Status', hot: false },
                    ].map(col => (
                      <th key={col.label} onClick={() => col.key && handleSort(col.key as SortKey)}
                          style={{ padding: '12px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: col.hot ? 800 : 700, color: col.hot ? '#C85E0A' : '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5, borderBottom: col.hot ? '2px solid #E8751A' : '1px solid #EDE3D8', cursor: col.key ? 'pointer' : 'default', whiteSpace: 'nowrap' as const, background: col.hot ? '#FFEAD5' : 'transparent' }}>
                        {col.label} {col.key === sortBy ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!progressLoaded && (
                    <tr><td colSpan={12} style={{ padding: 24, textAlign: 'center', color: '#8C7B6B', fontSize: 13 }}><span className="spin" style={{ display: 'inline-block', marginRight: 8 }}>⏳</span>Memuat data progress…</td></tr>
                  )}
                  {progressLoaded && filtered.length === 0 && (
                    <tr><td colSpan={12} style={{ padding: 24, textAlign: 'center', color: '#8C7B6B', fontSize: 13, fontStyle: 'italic' }}>Belum ada data progress.</td></tr>
                  )}
                  {filtered.map((k: any, i: number) => {
                    const hot = { background: i % 2 === 1 ? '#FFF3E6' : '#FFF8F1' }  // band highlight kolom kunci
                    const isRank = sortDir === 'desc' && (sortBy === 'persentase' || sortBy === 'realisasi' || sortBy === 'target_usaha')
                    return (
                    <tr key={k.id ?? k.kdkec ?? k.kecamatan} style={{ background: i % 2 === 1 ? '#FAFAFA' : 'white' }} className="tbl-row">
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: isRank && i < 3 ? '#E8751A' : '#F5EDE0', color: isRank && i < 3 ? 'white' : '#6B6B6B', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{k.nmkec ?? k.kecamatan}</td>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: '#1A1A1A', fontWeight: 800, ...hot }}>{k.target_usaha.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }} title="Sudah dicacah tapi belum disubmit (tidak dihitung selesai)">
                        <span style={{ color: '#1877F2', fontWeight: 700 }}>{(k.fasih?.draft ?? 0).toLocaleString('id-ID')}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 14, color: '#C85E0A', fontWeight: 800, ...hot }} title="Sudah dicacah (submitted + rejected + approved + revoked)">{k.realisasi.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#3D3D3D', fontWeight: 700 }} title="Sudah submit pencacah, menunggu approve">{((k.fasih?.submitted ?? 0) + (k.fasih?.submitted_responden ?? 0)).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }} title="Ditolak pengawas — sudah dicacah, masuk hitungan selesai cacah">
                        <span style={{ color: '#E8192C', fontWeight: 700 }}>{(k.fasih?.rejected ?? 0).toLocaleString('id-ID')}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }} title="Revoked pengawas (approve → revoked, menuju reject) — sudah dicacah, masuk hitungan selesai cacah">
                        <span style={{ color: '#9333EA', fontWeight: 700 }}>{(k.fasih?.revoked ?? 0).toLocaleString('id-ID')}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }} title="Diedit pengawas — sudah dicacah, masuk hitungan selesai cacah (belum di-approve)">
                        <span style={{ color: '#0EA5A4', fontWeight: 700 }}>{(k.fasih?.edited_pengawas ?? 0).toLocaleString('id-ID')}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }} title="Approved + finalisasi admin kabupaten (completed/edited admin)">
                        <span style={{ color: '#00A651', fontWeight: 700 }}>{(k.fasih?.selesai_approve ?? 0).toLocaleString('id-ID')}</span>
                        {k.fasih && <span style={{ color: '#8C7B6B', fontSize: 11 }}> ({k.fasih.pct_approve.toFixed(1)}%)</span>}
                      </td>
                      <td style={{ padding: '12px 14px', ...hot }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 7, background: '#FFE2C2', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg,#E8751A,#F5A623)', width: `${k.persentase}%`, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#C85E0A', minWidth: 38 }}>{k.persentase}%</span>
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
                  )})}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Tabel Progress Petugas ── */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(232,117,26,.07)', marginTop: 32 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                  {isWeekMode ? `🏆 Peringkat Mingguan Petugas (PPL)` : 'Progress Petugas Pencacah (PPL)'}
                </h3>
                <p style={{ fontSize: 12, color: '#8C7B6B', margin: '4px 0 0', maxWidth: 620 }}>
                  {isWeekMode
                    ? <>Peringkat <strong>{petugasWeekLabel}</strong> — dihitung <strong>hanya</strong> dari progres minggu itu, jadi tiap minggu bisa juara berbeda. Rincian status (Submitted/Rejected/Revoked) bertanda <strong>—</strong> karena snapshot harian hanya menyimpan total cacah &amp; approve.</>
                    : <>Realisasi pencacahan per petugas (akumulasi) — realtime. <strong>Selesai Cacah</strong> = <span style={{ color: '#3D3D3D' }}>Submitted</span> + <span style={{ color: '#E8192C' }}>Rejected</span> + <span style={{ color: '#9333EA' }}>Revoked</span> + <span style={{ color: '#0EA5A4' }}>Edited Pengawas</span> + <span style={{ color: '#00A651' }}>Approved &amp; Final</span>.</>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={petugasWeek} onChange={e => setPetugasWeek(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: petugasWeek ? '1.5px solid #E8751A' : '1px solid #EDE3D8', fontSize: 12, fontWeight: 700, color: petugasWeek ? '#C85E0A' : '#3D3D3D', outline: 'none', background: petugasWeek ? '#FFF7EF' : 'white' }} title="Pilih periode — Seluruh Waktu atau per minggu">
                  <option value="">🗓️ Seluruh Waktu</option>
                  {petugasWeeks.map((w: any) => <option key={w.start} value={w.start}>{w.label}</option>)}
                </select>
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
                    {[
                      { label: '#', key: null },
                      { label: 'Petugas (PPL)', key: 'nama_ppl' },
                      { label: 'Pengawas (PML)', key: 'nama_pml' },
                      { label: 'Kecamatan', key: 'nmkec' },
                      { label: 'Target', key: 'total' },
                      { label: 'Draft', key: 'draft' },
                      { label: isWeekMode ? 'Cacah Minggu Ini' : 'Selesai Cacah', key: 'selesai_cacah' },
                      { label: 'Submitted', key: 'submitted' },
                      { label: 'Rejected', key: 'rejected' },
                      { label: 'Revoked', key: 'revoked' },
                      { label: 'Edited Pengawas', key: 'edited_pengawas' },
                      { label: isWeekMode ? 'Approved Minggu Ini' : 'Approved & Final', key: 'selesai_approve' },
                      { label: isWeekMode ? 'Kontribusi' : 'Progress', key: 'pct_cacah' },
                      { label: 'Aksi', key: null },
                    ].map(c => (
                      <th key={c.label} onClick={() => c.key && pgClickSort(c.key)}
                        style={{ padding: '12px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5, borderBottom: '1px solid #EDE3D8', whiteSpace: 'nowrap' as const, cursor: c.key ? 'pointer' : 'default', background: '#FDF6EE' }}>
                        {c.label} {c.key && pgSort.key === c.key ? (pgSort.dir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPetugas.length === 0 && (
                    <tr><td colSpan={14} style={{ padding: 24, textAlign: 'center', color: '#8C7B6B', fontSize: 13 }}>{isWeekMode ? `Belum ada progres petugas pada ${petugasWeekLabel || 'minggu ini'}.` : 'Belum ada data petugas dari Fasih. Akan muncul setelah bot scraper mengirim update.'}</td></tr>
                  )}
                  {filteredPetugas.map((p: any, i: number) => (
                    <tr key={(p.nama_ppl ?? '') + i} style={{ background: isWeekRank && i < 3 ? '#FFF7EF' : (i % 2 ? '#FAFAFA' : 'white') }} className="tbl-row">
                      <td style={{ padding: '10px 14px', fontSize: isWeekRank && i < 3 ? 16 : 12, color: '#8C7B6B', fontWeight: isWeekRank && i < 3 ? 800 : 400 }}>
                        {isWeekRank && medal(i) ? <span title={`Peringkat #${i + 1} minggu ini`}>{medal(i)}</span> : i + 1}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{p.nama_ppl}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B6B' }}>{p.nama_pml}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B6B', whiteSpace: 'nowrap' }}>{p.nmkec}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#3D3D3D' }}>{p.total.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#1877F2', fontWeight: 700 }} title={isWeekMode ? 'Draft per-minggu tidak tersedia' : 'Sudah dicacah belum disubmit (tidak dihitung selesai)'}>{p.draft == null ? '—' : (p.draft).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#C85E0A' }} title="Sudah dicacah (submitted + rejected + approved + revoked)">{p.selesai_cacah.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#3D3D3D', fontWeight: 700 }} title="Sudah submit pencacah, menunggu approve">{p.submitted == null ? '—' : (p.submitted).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#E8192C', fontWeight: 700 }} title="Ditolak pengawas — sudah dicacah, masuk hitungan selesai cacah">{p.rejected == null ? '—' : (p.rejected).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#9333EA', fontWeight: 700 }} title="Revoked pengawas — sudah dicacah, masuk hitungan selesai cacah">{p.revoked == null ? '—' : (p.revoked).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#0EA5A4', fontWeight: 700 }} title="Diedit pengawas — sudah dicacah, masuk hitungan selesai cacah">{p.edited_pengawas == null ? '—' : (p.edited_pengawas).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#00A651', fontWeight: 700 }} title="Approved + finalisasi admin kabupaten">{p.selesai_approve.toLocaleString('id-ID')}</td>
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

          {/* ── Tabel Monitoring Pengawas (PML) ── */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(232,117,26,.07)', marginTop: 32 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Monitoring Progress Pengawas (PML)</h3>
                <p style={{ fontSize: 12, color: '#8C7B6B', margin: '4px 0 0', maxWidth: 640 }}>
                  Aktivitas review tiap pengawas atas unit PPL-nya: <span style={{ color: '#3D3D3D' }}>Submitted</span> (dari PPL), <span style={{ color: '#00A651' }}>Approved &amp; Final</span>, <span style={{ color: '#E8192C' }}>Rejected</span>, <span style={{ color: '#0EA5A4' }}>Edited</span> — diperbarui realtime.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={pengawasKec} onChange={e => setPengawasKec(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 12, fontWeight: 700, color: '#3D3D3D', outline: 'none', background: 'white' }}>
                  <option value="">🗺️ Semua Kecamatan</option>
                  {pengawasKecList.map((k: any) => <option key={k.kode_kec} value={k.kode_kec}>{k.nmkec}</option>)}
                </select>
                <input value={pengawasQ} onChange={e => setPengawasQ(e.target.value)} placeholder="Cari nama PML…" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 13, outline: 'none', width: 140 }} />
                <button onClick={exportPengawasCsv} disabled={!filteredPengawas.length} style={exBtn}>⬇ CSV</button>
                <button onClick={exportPengawasPng} disabled={!filteredPengawas.length} style={exBtn}>🖼️ PNG</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FDF6EE', position: 'sticky', top: 0 }}>
                    {[
                      { label: '#', key: null },
                      { label: 'Pengawas (PML)', key: 'nama_pml' },
                      { label: 'Kecamatan', key: 'nmkec' },
                      { label: 'Jumlah PPL', key: 'jumlah_ppl' },
                      { label: 'Total Assignment', key: 'jumlah_unit' },
                      { label: 'Submitted', key: 'submitted' },
                      { label: 'Approved & Final', key: 'approved' },
                      { label: 'Rejected', key: 'rejected' },
                      { label: 'Revoked', key: 'revoked' },
                      { label: 'Edited Pengawas', key: 'edited_pengawas' },
                      { label: 'Progress', key: 'pct_cacah' },
                    ].map(c => (
                      <th key={c.label} onClick={() => c.key && pgwClickSort(c.key)}
                        style={{ padding: '12px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5, borderBottom: '1px solid #EDE3D8', whiteSpace: 'nowrap' as const, cursor: c.key ? 'pointer' : 'default', background: '#FDF6EE' }}>
                        {c.label} {c.key && pgwSort.key === c.key ? (pgwSort.dir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPengawas.length === 0 && (
                    <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#8C7B6B', fontSize: 13 }}>Belum ada data pengawas dari Fasih. Akan muncul setelah bot scraper mengirim update.</td></tr>
                  )}
                  {filteredPengawas.map((p: any, i: number) => (
                    <tr key={(p.nama_pml ?? '') + p.nmkec + i} style={{ background: i % 2 ? '#FAFAFA' : 'white' }} className="tbl-row">
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#8C7B6B' }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{p.nama_pml}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B6B', whiteSpace: 'nowrap' }}>{p.nmkec}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#3D3D3D' }}>{p.jumlah_ppl.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#3D3D3D' }}>{p.jumlah_unit.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#3D3D3D', fontWeight: 700 }} title="Unit yang sudah disubmit PPL (menunggu approve)">{p.submitted.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#00A651', fontWeight: 700 }} title="Approved + finalisasi admin kabupaten">{p.approved.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#E8192C', fontWeight: 700 }}>{p.rejected.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#9333EA', fontWeight: 700 }}>{p.revoked.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#0EA5A4', fontWeight: 700 }} title="Unit yang diedit pengawas">{p.edited_pengawas.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', minWidth: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden', minWidth: 50 }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg,#E8751A,#F5A623)', width: `${Math.min(p.pct_cacah, 100)}%`, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#E8751A', minWidth: 38 }}>{p.pct_cacah.toFixed(1)}%</span>
                        </div>
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
