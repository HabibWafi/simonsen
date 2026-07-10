'use client'

import { useEffect, useState } from 'react'

/**
 * StatusDonut — donut komposisi status assignment se-Kabupaten (pure SVG, no dep).
 * Interaktif: hover/ketuk tiap slice atau baris legend → tengah donut menampilkan
 * status, jumlah, dan persentasenya. Legend juga menampilkan % proporsi.
 * Tinggi mengikuti container (sejajar peta). Tema oranye SE2026.
 */
type Props = {
  open: number; draft: number; submitted: number; approved: number
  rejected: number; revoked: number; editedPengawas: number; total: number; cacah: number
}

const DESC: Record<string, string> = {
  approved: 'Approved + finalisasi admin kabupaten',
  submitted: 'Submit, menunggu approve',
  draft: 'Draft — belum disubmit',
  rejected: 'Ditolak pengawas',
  revoked: 'Dicabut (approve → revoke)',
  edited_pengawas: 'Diedit pengawas (sudah dicacah)',
  open: 'Belum dikerjakan',
}

export default function StatusDonut({ open, draft, submitted, approved, rejected, revoked, editedPengawas, total, cacah }: Props) {
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])

  const segs = [
    { key: 'approved',        label: 'Approved & Final', value: approved,       color: '#00A651' },
    { key: 'submitted',       label: 'Submitted',        value: submitted,      color: '#E8751A' },
    { key: 'draft',           label: 'Draft',            value: draft,          color: '#1877F2' },
    { key: 'rejected',        label: 'Rejected',         value: rejected,       color: '#E8192C' },
    { key: 'revoked',         label: 'Revoked',          value: revoked,        color: '#9333EA' },
    { key: 'edited_pengawas', label: 'Edited Pengawas',  value: editedPengawas, color: '#0EA5A4' },
    { key: 'open',            label: 'Open',             value: open,           color: '#E7D8C4' },
  ]
  const sum = segs.reduce((a, s) => a + s.value, 0) || 1
  const pctCacah = total > 0 ? Math.round((cacah / total) * 1000) / 10 : 0
  const fmt = (n: number) => n.toLocaleString('id-ID')
  const pctOf = (v: number) => Math.round((v / sum) * 1000) / 10

  let acc = 0
  const arcs = segs.map(s => {
    const pct = (s.value / sum) * 100
    const a = { ...s, pct, offset: acc }
    acc += pct
    return a
  })
  const sel = arcs.find(a => a.key === active) || null
  const toggle = (k: string) => setActive(p => (p === k ? null : k))

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', boxShadow: '0 2px 16px rgba(232,117,26,.07)', padding: 18, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8192C', display: 'inline-block', animation: 'liveDot 1.4s ease-in-out infinite' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase', letterSpacing: .8 }}>Komposisi Status · Kabupaten</span>
      </div>
      <div style={{ fontSize: 12, color: '#8C7B6B', marginBottom: 8 }}>Arahkan / ketuk tiap bagian untuk lihat detail status</div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 162, height: 162, flexShrink: 0 }}>
            <svg viewBox="0 0 42 42" width="162" height="162" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
              <circle cx="21" cy="21" r="15.915" fill="none" stroke="#F5EFE7" strokeWidth="5" />
              {arcs.map((a, i) => {
                const isOn = active === a.key
                const dim = active != null && !isOn
                return (
                  <circle
                    key={a.key} cx="21" cy="21" r="15.915" fill="none"
                    stroke={a.color} strokeWidth={isOn ? 7 : 5} strokeLinecap="butt" pathLength={100}
                    strokeDasharray={mounted ? `${a.pct} ${100 - a.pct}` : '0 100'}
                    strokeDashoffset={-a.offset}
                    opacity={dim ? 0.32 : 1}
                    onMouseEnter={() => setActive(a.key)} onMouseLeave={() => setActive(null)}
                    onClick={() => toggle(a.key)}
                    style={{ cursor: 'pointer', transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1), stroke-width .18s ease, opacity .18s ease', transitionDelay: mounted ? '0s, 0s, 0s' : `${i * 0.1}s, 0s, 0s` }}
                  />
                )
              })}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 22px', pointerEvents: 'none' }}>
              {sel ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: sel.color }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>{sel.label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#C85E0A', lineHeight: 1.05, letterSpacing: -.5 }}>{fmt(sel.value)}</div>
                  <div style={{ fontSize: 11, color: '#8C7B6B', fontWeight: 700 }}>{pctOf(sel.value)}% dari total</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#C85E0A', lineHeight: 1, letterSpacing: -1 }}>{pctCacah}%</div>
                  <div style={{ fontSize: 10, color: '#8C7B6B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, marginTop: 3 }}>Selesai Cacah</div>
                </>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 178, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {arcs.map(a => {
              const isOn = active === a.key
              return (
                <button
                  key={a.key} title={DESC[a.key]}
                  onMouseEnter={() => setActive(a.key)} onMouseLeave={() => setActive(null)}
                  onClick={() => toggle(a.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isOn ? '#FFF4E8' : 'transparent', textAlign: 'left', width: '100%' }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0, border: a.key === 'open' ? '1px solid #D9C9B2' : 'none' }} />
                  <span style={{ color: '#3D3D3D', fontWeight: 600, flex: 1, whiteSpace: 'nowrap' }}>{a.label}</span>
                  <span style={{ color: '#1A1A1A', fontWeight: 700 }}>{fmt(a.value)}</span>
                  <span style={{ color: '#8C7B6B', fontWeight: 600, minWidth: 44, textAlign: 'right' }}>{pctOf(a.value)}%</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #EDE3D8', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: '#6B6B6B', flexWrap: 'wrap' }}>
        <span>Total assignment: <strong style={{ color: '#1A1A1A' }}>{fmt(total)}</strong></span>
        <span>Selesai cacah: <strong style={{ color: '#C85E0A' }}>{fmt(cacah)}</strong></span>
      </div>
    </div>
  )
}
