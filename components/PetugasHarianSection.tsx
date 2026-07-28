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
const ID_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
const fmtS = (iso: string) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${ID_MONTH[Number(m) - 1]}` }
function weekPresets() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const out: { n: number; start: string; end: string; label: string }[] = []
  let s = '2026-06-15', n = 1
  while (s <= '2026-08-31') { const e = addDays(s, 6); if (s <= today) out.push({ n, start: s, end: e, label: `Minggu ${n} (${fmtS(s)}–${fmtS(e)})` }); s = addDays(s, 7); n++ }
  return out
}

export default function PetugasHarianSection() {
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily')
  const [kec, setKec] = useState('')
  const [nama, setNama] = useState('')
  const [days, setDays] = useState(14)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [resp, setResp] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const chartRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const presets = useMemo(() => weekPresets(), [])

  const buildQs = () => {
    const qs = new URLSearchParams()
    if (mode === 'weekly') qs.set('mode', 'weekly')
    else if (from && to) { qs.set('from', from); qs.set('to', to) }
    else qs.set('days', String(days))
    if (kec) qs.set('kec', kec)
    if (nama) qs.set('nama', nama)
    return qs.toString()
  }

  useEffect(() => {
    let stop = false
    setLoading(true)
    const url = `/api/progress/petugas/harian?${buildQs()}`
    fetch(url, { cache: 'no-store' })
      .then(r => r.json()).then(j => { if (!stop) { setResp(j); setHidden(new Set()) } })
      .catch(() => {}).finally(() => { if (!stop) setLoading(false) })
    const id = setInterval(() => {
      if (document.hidden) return   // skip polling saat tab background
      fetch(url, { cache: 'no-store' }).then(r => r.json()).then(j => { if (!stop) setResp(j) }).catch(() => {})
    }, 60000)
    return () => { stop = true; clearInterval(id) }
  }, [mode, kec, nama, days, from, to])

  const dates = resp?.dates ?? []
  const series = resp?.series ?? []
  // Tampilkan SEMUA seri (semua kecamatan / semua petugas), tidak dibatasi.
  const shown = series.filter(s => !hidden.has(s.key))
  // Warna stabil per-seri (index di array penuh) → chip & garis grafik selalu sewarna.
  const colorOf = (key: string) => {
    const idx = series.findIndex(s => s.key === key)
    return PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length]
  }

  // Garis acuan di grafik = RATA-RATA (bukan total) supaya skala tidak didominasi
  // total kabupaten/kecamatan sehingga garis lain tetap terlihat. Tabel tetap total.
  const nSeries = series.length || 1
  const avgName = kec ? 'Rata-rata per petugas' : 'Rata-rata per kecamatan'
  const chartData = useMemo(() => dates.map((d, i) => {
    const total = resp?.aggregate?.data[i] ?? 0
    const row: any = { date: d, __avg: Math.round((total / nSeries) * 10) / 10 }
    for (const s of shown) row[s.key] = s.data[i] ?? 0
    return row
  }), [dates, shown, resp, nSeries])

  function downloadChart(format: 'png' | 'jpeg') {
    const svg = chartRef.current?.querySelector('svg.recharts-surface') as SVGSVGElement | null
    if (svg) exportSvgNodePng(svg, `performa-${mode}${kec ? '-' + kec : ''}.${format === 'jpeg' ? 'jpg' : 'png'}`, { format, scale: 2 })
  }
  function downloadTableCsv() {
    const headers = ['Nama', 'Kecamatan', ...dates, 'Total']
    const rows = series.map(s => [s.name, s.nmkec, ...s.data, s.data.reduce((a, b) => a + b, 0)])
    if (resp?.aggregate) rows.unshift([resp.aggregate.name, '', ...resp.aggregate.data, resp.aggregate.data.reduce((a, b) => a + b, 0)])
    exportCsv(`performa-${mode}${kec ? '-' + kec : ''}.csv`, headers, rows as any)
  }

  // dropdown rentang: "N hari" atau preset minggu (set from/to)
  const rangeValue = from && to ? `w:${from}` : `d:${days}`
  function onRangeChange(v: string) {
    if (v.startsWith('w:')) { const p = presets.find(x => `w:${x.start}` === v); if (p) { setFrom(p.start); setTo(p.end) } }
    else { setFrom(''); setTo(''); setDays(Number(v.slice(2))) }
  }

  return (
    <div ref={rootRef} style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', boxShadow: '0 2px 16px rgba(232,117,26,.07)', marginTop: 32, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDE3D8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Performa {mode === 'weekly' ? 'Mingguan' : 'Harian'} Petugas</h3>
          {/* toggle Harian / Mingguan */}
          <div style={{ display: 'inline-flex', background: '#FFF0DC', borderRadius: 99, padding: 3, border: '1px solid rgba(232,117,26,.2)' }}>
            {(['daily', 'weekly'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '5px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: mode === m ? '#E8751A' : 'transparent', color: mode === m ? 'white' : '#6B6B6B' }}>
                {m === 'daily' ? 'Harian' : 'Mingguan'}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#8C7B6B', margin: '6px 0 14px' }}>
          {mode === 'weekly'
            ? <>Total progress tiap <strong>minggu</strong> (Senin–Minggu, ditutup tiap Minggu) sejak 15 Jun — untuk dasar apresiasi petugas terbaik mingguan. </>
            : <>Tambahan progress per hari (selisih cumulative antar hari). </>}
          {kec ? 'Garis = tiap petugas.' : 'Garis = tiap kecamatan.'} Garis oranye putus-putus = <strong>rata-rata</strong> (acuan). Angka total ada di tabel.
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
          {mode === 'daily' && (
            <>
              <select value={rangeValue} onChange={e => onRangeChange(e.target.value)} style={sel}>
                <optgroup label="Cepat">
                  {[7, 14, 30, 60].map(d => <option key={d} value={`d:${d}`}>{d} hari terakhir</option>)}
                </optgroup>
                <optgroup label="Per Minggu">
                  {presets.map(p => <option key={p.start} value={`w:${p.start}`}>{p.label}</option>)}
                </optgroup>
              </select>
              <span style={{ fontSize: 11, color: '#8C7B6B' }}>atau</span>
              <input type="date" value={from} min="2026-06-15" max="2026-08-31" onChange={e => setFrom(e.target.value)} style={{ ...sel, fontWeight: 500 }} />
              <span style={{ fontSize: 11, color: '#8C7B6B' }}>s/d</span>
              <input type="date" value={to} min="2026-06-15" max="2026-08-31" onChange={e => setTo(e.target.value)} style={{ ...sel, fontWeight: 500 }} />
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => downloadChart('png')} style={btn}>🖼️ Grafik PNG</button>
            <button onClick={downloadTableCsv} style={btn}>⬇ CSV</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {loading && !resp ? <div style={{ color: '#6B6B6B', padding: 40, textAlign: 'center' }}>Memuat…</div>
          : dates.length === 0 ? <div style={{ color: '#8C7B6B', padding: 40, textAlign: 'center', fontStyle: 'italic' }}>Belum ada data {mode === 'weekly' ? 'mingguan' : 'harian'}. Akan terisi seiring bot mengirim update (butuh ≥2 {mode === 'weekly' ? 'minggu' : 'hari'} untuk menampilkan tren).</div>
          : (
          <>
            {/* toggle chips (sembunyikan/tampilkan garis) */}
            {series.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {series.map((s) => {
                  const off = hidden.has(s.key)
                  return (
                    <button key={s.key} onClick={() => setHidden(prev => { const n = new Set(prev); n.has(s.key) ? n.delete(s.key) : n.add(s.key); return n })}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, border: '1px solid #EDE3D8', background: off ? '#F5F5F5' : 'white', color: off ? '#B0A697' : '#3D3D3D', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: off ? 'line-through' : 'none' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: colorOf(s.key), display: 'inline-block', opacity: off ? .3 : 1 }} />
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
                  {shown.map((s) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={colorOf(s.key)} strokeWidth={1.6} dot={{ r: 2 }} />
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
                    {dates.map(d => <th key={d} style={{ ...thS, textAlign: 'right' }}>{d}</th>)}
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
