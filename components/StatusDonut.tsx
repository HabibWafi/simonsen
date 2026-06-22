'use client'

import { useEffect, useState } from 'react'

/**
 * StatusDonut — donut komposisi status assignment se-Kabupaten (pure SVG, no dep).
 * Tema oranye SE2026 + warna status konsisten dgn tabel (draft biru, approved hijau,
 * rejected merah, revoked ungu, submitted oranye, open krem). Animasi draw-in bertahap.
 */
type Props = {
  open: number; draft: number; submitted: number; approved: number
  rejected: number; revoked: number; total: number; cacah: number
}

export default function StatusDonut({ open, draft, submitted, approved, rejected, revoked, total, cacah }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])

  const segs = [
    { key: 'approved',  label: 'Approved',  value: approved,  color: '#00A651' },
    { key: 'submitted', label: 'Submitted', value: submitted, color: '#E8751A' },
    { key: 'draft',     label: 'Draft',     value: draft,     color: '#1877F2' },
    { key: 'rejected',  label: 'Rejected',  value: rejected,  color: '#E8192C' },
    { key: 'revoked',   label: 'Revoked',   value: revoked,   color: '#9333EA' },
    { key: 'open',      label: 'Open',      value: open,      color: '#E7D8C4' },
  ]
  const sum = segs.reduce((a, s) => a + s.value, 0) || 1
  const pctCacah = total > 0 ? Math.round((cacah / total) * 1000) / 10 : 0
  const fmt = (n: number) => n.toLocaleString('id-ID')

  let acc = 0
  const arcs = segs.map(s => {
    const pct = (s.value / sum) * 100
    const a = { ...s, pct, offset: acc }
    acc += pct
    return a
  })

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', boxShadow: '0 2px 16px rgba(232,117,26,.07)', padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8192C', display: 'inline-block', animation: 'liveDot 1.4s ease-in-out infinite' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase', letterSpacing: .8 }}>Komposisi Status · Kabupaten</span>
      </div>
      <div style={{ fontSize: 12, color: '#8C7B6B', marginBottom: 12 }}>Sebaran seluruh assignment per status Fasih</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 148, height: 148, flexShrink: 0 }}>
          <svg viewBox="0 0 42 42" width="148" height="148" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
            <circle cx="21" cy="21" r="15.915" fill="none" stroke="#F5EFE7" strokeWidth="5" />
            {arcs.map((a, i) => (
              <circle
                key={a.key} cx="21" cy="21" r="15.915" fill="none"
                stroke={a.color} strokeWidth="5" strokeLinecap="butt" pathLength={100}
                strokeDasharray={mounted ? `${a.pct} ${100 - a.pct}` : '0 100'}
                strokeDashoffset={-a.offset}
                style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)', transitionDelay: `${i * 0.1}s` }}
              />
            ))}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#C85E0A', lineHeight: 1, letterSpacing: -1 }}>{pctCacah}%</div>
            <div style={{ fontSize: 9, color: '#8C7B6B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, marginTop: 3 }}>Selesai Cacah</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 160, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 14px' }}>
          {arcs.map(a => (
            <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: a.color, flexShrink: 0, border: a.key === 'open' ? '1px solid #D9C9B2' : 'none' }} />
              <span style={{ color: '#3D3D3D', fontWeight: 600, flex: 1, whiteSpace: 'nowrap' }}>{a.label}</span>
              <span style={{ color: '#1A1A1A', fontWeight: 700 }}>{fmt(a.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #EDE3D8', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: '#6B6B6B', flexWrap: 'wrap' }}>
        <span>Total assignment: <strong style={{ color: '#1A1A1A' }}>{fmt(total)}</strong></span>
        <span>Selesai cacah: <strong style={{ color: '#C85E0A' }}>{fmt(cacah)}</strong></span>
      </div>
    </div>
  )
}
