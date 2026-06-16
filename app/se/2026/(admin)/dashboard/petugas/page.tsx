'use client'

import { useEffect, useState } from 'react'

type Petugas = {
  pencacah: string; nama_ppl: string; nama_pml: string
  total: number; target?: number
  selesai_cacah: number; selesai_approve: number
  pct_cacah: number; pct_approve: number
  open: number; draft: number; submitted: number; approved: number
}
type Pengawas = {
  pengawas: string; nama_pml: string; jumlah_ppl: number; total: number; target: number
  selesai_cacah: number; selesai_approve: number; pct_cacah: number; pct_approve: number
}
type Kec = { kode_kec: string; nmkec: string }

export default function PetugasProgressPage() {
  const [kec, setKec] = useState('')
  const [petugas, setPetugas] = useState<Petugas[]>([])
  const [pengawas, setPengawas] = useState<Pengawas[]>([])
  const [kecList, setKecList] = useState<Kec[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'petugas' | 'pengawas'>('petugas')
  const [q, setQ] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/petugas-progress${kec ? `?kec=${encodeURIComponent(kec)}` : ''}`)
      .then(r => r.json())
      .then(j => { setPetugas(j.petugas ?? []); setPengawas(j.pengawas ?? []); setKecList(j.kecamatanList ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [kec])

  const filtered = petugas.filter(p =>
    !q || p.nama_ppl?.toLowerCase().includes(q.toLowerCase()) || p.pencacah?.toLowerCase().includes(q.toLowerCase()) || p.nama_pml?.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Progress Per Petugas</h1>
        <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>Realisasi pencacahan per PPL & PML — data dari scraper Fasih (selesai cacah = submitted pencacah).</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #EDE3D8' }}>
        <Tab active={tab === 'petugas'} onClick={() => setTab('petugas')}>👤 Pencacah ({petugas.length})</Tab>
        <Tab active={tab === 'pengawas'} onClick={() => setTab('pengawas')}>🧑‍💼 Pengawas ({pengawas.length})</Tab>
      </div>

      {tab === 'petugas' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <select value={kec} onChange={e => setKec(e.target.value)} style={selStyle}>
            <option value="">🗺️ Semua Kecamatan</option>
            {kecList.map(k => <option key={k.kode_kec} value={k.kode_kec}>{k.nmkec}</option>)}
          </select>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / email…" style={{ ...selStyle, minWidth: 220, flex: 1 }} />
        </div>
      )}

      {loading ? <div style={{ color: '#6B6B6B' }}>Memuat…</div> : tab === 'petugas' ? (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#FDF6EE' }}>
              {['Pencacah (PPL)', 'PML', 'Target', 'Selesai Cacah', 'Approved', 'Open/Draft'].map(h => <Th key={h}>{h}</Th>)}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#8C7B6B' }}>Belum ada data Fasih. Jalankan import / push dari bot scraper.</td></tr>}
              {filtered.map((p, i) => (
                <tr key={p.pencacah} style={{ background: i % 2 ? '#FAFAFA' : 'white' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 700, color: '#1A1A1A' }}>{p.nama_ppl || '—'}</div>
                    <div style={{ fontSize: 11, color: '#8C7B6B' }}>{p.pencacah}</div>
                  </td>
                  <td style={td}>{p.nama_pml || '—'}</td>
                  <td style={td}>{(p.target ?? p.total).toLocaleString('id-ID')}</td>
                  <td style={td}><Bar value={p.pct_cacah} num={p.selesai_cacah} /></td>
                  <td style={td}><span style={{ color: '#00A651', fontWeight: 700 }}>{p.selesai_approve.toLocaleString('id-ID')}</span> <span style={{ color: '#8C7B6B', fontSize: 11 }}>({p.pct_approve.toFixed(1)}%)</span></td>
                  <td style={td}><span style={{ color: '#8C7B6B' }}>{p.open.toLocaleString('id-ID')} / {p.draft.toLocaleString('id-ID')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#FDF6EE' }}>
              {['Pengawas (PML)', 'Jml PPL', 'Target', 'Selesai Cacah', 'Approved'].map(h => <Th key={h}>{h}</Th>)}
            </tr></thead>
            <tbody>
              {pengawas.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#8C7B6B' }}>Belum ada data.</td></tr>}
              {pengawas.map((p, i) => (
                <tr key={p.pengawas} style={{ background: i % 2 ? '#FAFAFA' : 'white' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 700, color: '#1A1A1A' }}>{p.nama_pml || '—'}</div>
                    <div style={{ fontSize: 11, color: '#8C7B6B' }}>{p.pengawas}</div>
                  </td>
                  <td style={td}>{Number(p.jumlah_ppl).toLocaleString('id-ID')}</td>
                  <td style={td}>{Number(p.target).toLocaleString('id-ID')}</td>
                  <td style={td}><Bar value={Number(p.pct_cacah)} num={Number(p.selesai_cacah)} /></td>
                  <td style={td}><span style={{ color: '#00A651', fontWeight: 700 }}>{Number(p.selesai_approve).toLocaleString('id-ID')}</span> <span style={{ color: '#8C7B6B', fontSize: 11 }}>({Number(p.pct_approve).toFixed(1)}%)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const selStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 13, fontWeight: 600, color: '#3D3D3D', outline: 'none', background: 'white' }
const tableWrap: React.CSSProperties = { background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'auto' }
const td: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid #F0E9E0' }

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: .5, borderBottom: '1px solid #EDE3D8', whiteSpace: 'nowrap' }}>{children}</th>
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: '10px 16px', border: 'none', background: 'none', borderBottom: active ? '2px solid #E8751A' : '2px solid transparent', color: active ? '#E8751A' : '#6B6B6B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{children}</button>
}
function Bar({ value, num }: { value: number; num: number }) {
  return (
    <div style={{ minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ fontWeight: 700, color: '#C85E0A' }}>{num.toLocaleString('id-ID')}</span>
        <span style={{ color: '#8C7B6B' }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, borderRadius: 99, background: 'linear-gradient(90deg,#E8751A,#F5A623)' }} />
      </div>
    </div>
  )
}
