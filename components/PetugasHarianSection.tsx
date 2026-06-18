'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { exportCsv, exportSvgNodePng } from '@/lib/exportTable'

type Series = { key: string; name: string; kode_kec: string; nmkec: string; data: number[] }
type Resp = {
  dates: string[]
  series: Series[]
  aggregate: { name: string; data: number[] } | null
  kecamatanList: { kode_kec: string; nmkec: string }[]
  petugasList: { nama_ppl: string }[]
}

const PALETTE = ['#E8751A', '#1877F2', '#00A651', '#9333EA', '#E8192C', '#0EA5A4', '#D97706', '#DB2777', '#475569', '#65A30D']
const fmtDate = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}` }

export default function PetugasHarianSection() {
  const [kec, setKec] = useState('')
  const [nama, setNama] = useState('')
  const [days, setDays] = useState(14)
  const [resp, setResp] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const chartRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let stop = false
    setLoading(true)
    const qs = new URLSearchParams({ days: String(days) })
    if (kec) qs.set('kec', kec)
    if (nama) qs.set('nama', nama)
    fetch(`/api/progress/petugas/harian?${qs}`, { cache: 'no-store' })
      .then(r => r.json()).then(j => { if (!stop) { setResp(j); setHidden(new Set()) } })
      .catch(() => {}).finally(() => { if (!stop) setLoading(false) })
    const id = setInterval(() => {
      fetch(`/api/progress/petugas/harian?${qs}`, { cache: 'no-store' }).then(r => r.json()).then(j => { if (!stop) setResp(j) }).catch(() => {})
    }, 60000)
    return () => { stop = true; clearInterval(id) }
  }, [kec, nama, days])

  const dates = resp?.dates ?? []
  const series = resp?.series ?? []
  const shown = series.filter(s => !hidden.has(s.key)).slice(0, 10)

  // Garis acuan di grafik = RATA-RATA (bukan total) supaya skala tidak didominasi
  // total kabupaten/kecamatan sehingga garis lain tetap terlihat. Tabel tetap total.
  const nSeries = series.length || 1
  const avgName = kec ? 'Rata-rata per petugas' : 'Rata-rata per kecamatan'
  const chartData = useMemo(() => dates.map((d, i) => {
    const total = resp?.aggregate?.data[i] ?? 0
    const row: any = { date: fmtDate(d), __avg: Math.round((total / nSeries) * 10) / 10 }
    for (const s of shown) row[s.key] = s.data[i] ?? 0
    return row
  }), [dates, shown, resp, nSeries])

  function downloadChart(format: 'png' | 'jpeg') {
    const svg = chartRef.current?.querySelector('svg.recharts-surface') as SVGSVGElement | null
    if (svg) exportSvgNodePng(svg, `performa-harian${kec ? '-' + kec : ''}.${format === 'jpeg' ? 'jpg' : 'png'}`, { format, scale: 2 })
  }
  function downloadTableCsv() {
    const headers = ['Nama', 'Kecamatan', ...dates.map(fmtDate), 'Total']
    const rows = series.map(s => [s.name, s.nmkec, ...s.data, s.data.reduce((a, b) => a + b, 0)])
    if (resp?.aggregate) rows.unshift([resp.aggregate.name, '', ...resp.aggregate.data, resp.aggregate.data.reduce((a, b) => a + b, 0)])
    exportCsv(`performa-harian${kec ? '-' + kec : ''}.csv`, headers, rows as any)
  }

  return (
    <div ref={rootRef} style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', boxShadow: '0 2px 16px rgba(232,117,26,.07)', marginTop: 32, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE3D8' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Performa Harian Petugas</h3>
        <p style={{ fontSize: 12, color: '#8C7B6B', margin: '4px 0 14px' }}>
          Tambahan progress per hari (selisih cumulative antar hari) untuk evaluasi tren. {kec ? 'Garis = tiap petugas.' : 'Garis = tiap kecamatan.'} Garis oranye putus-putus = <strong>rata-rata</strong> (acuan). Angka total ada di tabel.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={kec} onChange={e => { setKec(e.target.value); setNama('') }} style={sel}>
            <option value="">🗺️ Semua Kecamatan (per-kec)</option>
            {(resp?.kecamatanList ?? []).map(k => <option key={k.kode_kec} value={k.kode_kec}>{k.nmkec}</option>)}
          </select>
          {kec && (
            <select value={nama} onChange={e => setNama(e.target.value)} style={sel}>
              <option value="">👥 Semua petugas di kec ini</option>
              {(resp?.petugasList ?? []).map(p => <option key={p.nama_ppl} value={p.nama_ppl}>{p.nama_ppl}</option>)}
            </select>
          )}
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={sel}>
            {[7, 14, 30, 60].map(d => <option key={d} value={d}>{d} hari terakhir</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => downloadChart('png')} style={btn}>🖼️ Grafik PNG</button>
            <button onClick={downloadTableCsv} style={btn}>⬇ CSV</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {loading && !resp ? <div style={{ color: '#6B6B6B', padding: 40, textAlign: 'center' }}>Memuat…</div>
          : dates.length === 0 ? <div style={{ color: '#8C7B6B', padding: 40, textAlign: 'center', fontStyle: 'italic' }}>Belum ada data harian. Akan terisi seiring bot mengirim update tiap hari (butuh ≥2 hari untuk menampilkan tren).</div>
          : (
          <>
            {/* toggle chips (sembunyikan/tampilkan garis) */}
            {series.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {series.slice(0, 12).map((s, i) => {
                  const off = hidden.has(s.key)
                  return (
                    <button key={s.key} onClick={() => setHidden(prev => { const n = new Set(prev); n.has(s.key) ? n.delete(s.key) : n.add(s.key); return n })}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, border: '1px solid #EDE3D8', background: off ? '#F5F5F5' : 'white', color: off ? '#B0A697' : '#3D3D3D', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: off ? 'line-through' : 'none' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: PALETTE[i % PALETTE.length], display: 'inline-block', opacity: off ? .3 : 1 }} />
                      {s.name}
                    </button>
                  )
                })}
              </div>
            )}

            <div ref={chartRef} style={{ width: '100%', height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E9E0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C7B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8C7B6B' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EDE3D8' }} />
                  <Line type="monotone" dataKey="__avg" name={avgName} stroke="#E8751A" strokeWidth={3} strokeDasharray="6 4" dot={false} />
                  {shown.map((s, i) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={PALETTE[i % PALETTE.length]} strokeWidth={1.6} dot={{ r: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabel performa harian */}
            <div style={{ overflowX: 'auto', marginTop: 16, border: '1px solid #EDE3D8', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#FDF6EE' }}>
                    <th style={thS}>Petugas / Wilayah</th>
                    {dates.map(d => <th key={d} style={{ ...thS, textAlign: 'right' }}>{fmtDate(d)}</th>)}
                    <th style={{ ...thS, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resp?.aggregate && (
                    <tr style={{ background: '#FFF7EF', fontWeight: 700 }}>
                      <td style={tdS}>{resp.aggregate.name}</td>
                      {resp.aggregate.data.map((v, i) => <td key={i} style={{ ...tdS, textAlign: 'right', color: '#C85E0A' }}>{v}</td>)}
                      <td style={{ ...tdS, textAlign: 'right', color: '#C85E0A' }}>{resp.aggregate.data.reduce((a, b) => a + b, 0)}</td>
                    </tr>
                  )}
                  {series.map((s, ri) => (
                    <tr key={s.key} style={{ background: ri % 2 ? '#FAFAFA' : 'white' }}>
                      <td style={tdS}>{s.name}{!kec && '' /* kec view: nama petugas */}</td>
                      {s.data.map((v, i) => <td key={i} style={{ ...tdS, textAlign: 'right', color: v > 0 ? '#1A1A1A' : '#C9BEB1' }}>{v}</td>)}
                      <td style={{ ...tdS, textAlign: 'right', fontWeight: 700, color: '#E8751A' }}>{s.data.reduce((a, b) => a + b, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const sel: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 12, fontWeight: 700, color: '#3D3D3D', outline: 'none', background: 'white' }
const btn: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E8751A', background: 'transparent', color: '#E8751A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const thS: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: .3, borderBottom: '1px solid #EDE3D8', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#FDF6EE' }
const tdS: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #F0E9E0', whiteSpace: 'nowrap' }
