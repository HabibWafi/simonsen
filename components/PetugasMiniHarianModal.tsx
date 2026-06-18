'use client'

import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { exportSvgNodePng } from '@/lib/exportTable'

const fmtDate = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}` }

/**
 * Popup grafik kecil progress harian SATU petugas (independen dari section bawah).
 * Dibuka dari tombol "Harian" di tabel Progress Petugas.
 */
export default function PetugasMiniHarianModal({ kec, nama, nmkec, onClose }: {
  kec: string; nama: string; nmkec?: string; onClose: () => void
}) {
  const [dates, setDates] = useState<string[]>([])
  const [daily, setDaily] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let stop = false
    setLoading(true)
    const qs = new URLSearchParams({ days: '30', nama })
    if (kec) qs.set('kec', kec)
    fetch(`/api/progress/petugas/harian?${qs}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (stop) return
        const ds: string[] = j.dates ?? []
        const series: any[] = j.series ?? []
        // jumlahkan semua series (biasanya 1 petugas; kalau lintas kec → digabung)
        const dd = ds.map((_, i) => series.reduce((a, s) => a + (s.data[i] ?? 0), 0))
        setDates(ds); setDaily(dd)
      })
      .catch(() => {})
      .finally(() => { if (!stop) setLoading(false) })
    return () => { stop = true }
  }, [kec, nama])

  const chartData = dates.map((d, i) => ({ date: fmtDate(d), val: daily[i] ?? 0 }))
  const total = daily.reduce((a, b) => a + b, 0)
  const avg = daily.length ? Math.round((total / daily.length) * 10) / 10 : 0
  const best = daily.length ? Math.max(...daily) : 0
  const last = daily.length ? daily[daily.length - 1] : 0

  function downloadPng() {
    const svg = chartRef.current?.querySelector('svg.recharts-surface') as SVGSVGElement | null
    if (svg) exportSvgNodePng(svg, `harian-${nama}.png`, { scale: 2 })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 600, boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase', letterSpacing: 1 }}>Progress Harian Petugas</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1A1A' }}>{nama}</div>
            {nmkec && <div style={{ fontSize: 12, color: '#8C7B6B' }}>Kecamatan {nmkec}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#8C7B6B', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* ringkasan */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { label: 'Total (window)', val: total, color: '#C85E0A' },
              { label: 'Rata-rata/hari', val: avg, color: '#1877F2' },
              { label: 'Hari terbaik', val: best, color: '#00A651' },
              { label: 'Hari terakhir', val: last, color: '#3D3D3D' },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 110px', background: '#FAF8F5', border: '1px solid #EDE3D8', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#8C7B6B', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {loading && !dates.length ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8C7B6B' }}>Memuat…</div>
          ) : dates.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8C7B6B', fontStyle: 'italic', textAlign: 'center', padding: 16 }}>
              Belum ada data harian untuk petugas ini (butuh ≥2 hari rekam dari bot).
            </div>
          ) : (
            <div ref={chartRef} style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E9E0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8C7B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8C7B6B' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EDE3D8' }} />
                  <Line type="monotone" dataKey="val" name="Selesai cacah/hari" stroke="#E8751A" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #EDE3D8', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={downloadPng} disabled={!dates.length} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #E8751A', background: 'transparent', color: '#E8751A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🖼️ Simpan PNG</button>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#E8751A', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
