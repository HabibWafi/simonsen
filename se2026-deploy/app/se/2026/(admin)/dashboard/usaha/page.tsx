'use client'

import { useEffect, useState } from 'react'

interface Usaha {
  idsbr: string
  nama: string
  alamat: string | null
  kdkec: string
  nmkec: string
  kddesa: string
  nmdesa: string
  skala_usaha: 'UMK' | 'UM' | 'UB'
  status_pencacahan: 'belum' | 'proses' | 'selesai' | 'tolak' | 'tutup' | 'ganda'
  tanggal_cacah: string | null
  lat: number | null
  lng: number | null
}

interface KecOpt { kdkec: string; nmkec: string }

const STATUS_OPTS = [
  { v: '',        label: 'Semua Status' },
  { v: 'belum',   label: 'Belum',    color: '#8C7B6B' },
  { v: 'proses',  label: 'Proses',   color: '#F5A623' },
  { v: 'selesai', label: 'Selesai',  color: '#00A651' },
  { v: 'tolak',   label: 'Tolak',    color: '#E8192C' },
  { v: 'tutup',   label: 'Tutup',    color: '#6B6B6B' },
  { v: 'ganda',   label: 'Ganda',    color: '#1877F2' },
]
const SKALA_OPTS = [
  { v: '',    label: 'Semua Skala' },
  { v: 'UMK', label: 'Mikro & Kecil' },
  { v: 'UM',  label: 'Menengah' },
  { v: 'UB',  label: 'Besar' },
]

export default function DashboardUsahaPage() {
  const [items, setItems] = useState<Usaha[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [kecs, setKecs] = useState<KecOpt[]>([])

  const [q, setQ] = useState('')
  const [kec, setKec] = useState('')
  const [skala, setSkala] = useState('')
  const [status, setStatus] = useState('')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (kec) params.set('kec', kec)
    if (skala) params.set('skala', skala)
    if (status) params.set('status', status)
    params.set('page', String(page))
    params.set('per', '50')
    try {
      const res = await fetch(`/api/usaha?${params}`).then(r => r.json())
      setItems(res.data ?? [])
      setTotal(res.total ?? 0)
      setPageCount(res.pageCount ?? 1)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [page, kec, skala, status])

  useEffect(() => {
    fetch('/api/admin/kecamatan').then(r => r.json()).then(j => setKecs(j.data ?? [])).catch(() => {})
  }, [])

  function exportCsv() {
    const header = 'IDSBR,Nama,Alamat,Kecamatan,Desa,Skala,Status,Tanggal Cacah,Lat,Lng'
    const rows = items.map(u =>
      [u.idsbr, q1(u.nama), q1(u.alamat ?? ''), q1(u.nmkec), q1(u.nmdesa), u.skala_usaha,
       u.status_pencacahan, u.tanggal_cacah ?? '', u.lat ?? '', u.lng ?? ''].join(','),
    )
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `usaha-se2026-page${page}.csv`; a.click()
  }
  function q1(s: string) { return `"${String(s).replace(/"/g, '""')}"` }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Daftar Usaha</h1>
          <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>Master & progress pencacahan per IDSBR. Update via menu Import.</p>
        </div>
        <button onClick={exportCsv} style={btnGhost}>⬇ Export CSV (halaman aktif)</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        <input placeholder="🔍 IDSBR atau nama…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setPage(1), load())} style={input} />
        <select value={kec} onChange={e => { setPage(1); setKec(e.target.value) }} style={input}>
          <option value="">Semua Kecamatan</option>
          {kecs.map(k => <option key={k.kdkec} value={k.kdkec}>{k.nmkec}</option>)}
        </select>
        <select value={skala} onChange={e => { setPage(1); setSkala(e.target.value) }} style={input}>
          {SKALA_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <select value={status} onChange={e => { setPage(1); setStatus(e.target.value) }} style={input}>
          {STATUS_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <button onClick={() => { setPage(1); load() }} style={btnPrimary}>Cari</button>
      </div>

      <div style={{ fontSize: 12, color: '#8C7B6B', marginBottom: 10 }}>
        Menampilkan {items.length} dari <b>{total.toLocaleString('id-ID')}</b> usaha • Hal {page}/{pageCount}
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAF8F5', textAlign: 'left' as const }}>
                <th style={th}>IDSBR</th>
                <th style={th}>Nama Usaha</th>
                <th style={th}>Kec / Desa</th>
                <th style={th}>Skala</th>
                <th style={th}>Status</th>
                <th style={th}>Cacah</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#6B6B6B' }}>Memuat…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#8C7B6B', fontStyle: 'italic' }}>Tidak ada data. Pastikan master usaha sudah di-import.</td></tr>
              ) : items.map(u => {
                const sMeta = STATUS_OPTS.find(s => s.v === u.status_pencacahan)
                return (
                  <tr key={u.idsbr} style={{ borderTop: '1px solid #EDE3D8' }}>
                    <td style={td}><code style={{ fontSize: 11, background: '#F5EDE0', padding: '2px 6px', borderRadius: 4 }}>{u.idsbr}</code></td>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {u.nama}
                      {u.alamat && <div style={{ fontSize: 11, color: '#8C7B6B', fontWeight: 400, marginTop: 2 }}>{u.alamat}</div>}
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: 12 }}>{u.nmkec}</div>
                      <div style={{ fontSize: 11, color: '#8C7B6B' }}>{u.nmdesa}</div>
                    </td>
                    <td style={td}>
                      <span style={{ background: '#F5EDE0', color: '#C85E0A', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{u.skala_usaha}</span>
                    </td>
                    <td style={td}>
                      <span style={{ background: (sMeta?.color ?? '#888') + '15', color: sMeta?.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {sMeta?.label ?? u.status_pencacahan}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: 12, color: '#6B6B6B' }}>
                      {u.tanggal_cacah ? new Date(u.tanggal_cacah).toLocaleDateString('id-ID') : '—'}
                      {u.lat != null && u.lng != null && <div style={{ fontSize: 10, color: '#8C7B6B' }}>📍 {Number(u.lat).toFixed(4)},{Number(u.lng).toFixed(4)}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 18 }}>
        <button onClick={() => setPage(1)} disabled={page === 1} style={pageBtn}>«</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>‹</button>
        <span style={{ fontSize: 13, color: '#3D3D3D', padding: '0 12px' }}>Halaman {page} / {pageCount}</span>
        <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page >= pageCount} style={pageBtn}>›</button>
        <button onClick={() => setPage(pageCount)} disabled={page >= pageCount} style={pageBtn}>»</button>
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, background: 'transparent', color: '#E8751A', border: '1.5px solid #E8751A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const input: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #EDE3D8', fontSize: 13, outline: 'none', background: 'white' }
const th: React.CSSProperties = { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5 }
const td: React.CSSProperties = { padding: '11px 14px', color: '#3D3D3D', verticalAlign: 'top' as const }
const pageBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, background: 'white', color: '#3D3D3D', border: '1px solid #EDE3D8', fontSize: 14, cursor: 'pointer', minWidth: 36 }
