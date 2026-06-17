'use client'

import { useEffect, useState } from 'react'

/**
 * Badge "data terakhir diperbarui" berbasis waktu INGEST sebenarnya dari bot
 * (fasih_snapshot.created_at), bukan waktu fetch client.
 * Relative time ikut bertambah tiap 15 dtk → kalau bot berhenti, terlihat menua
 * (berubah merah saat > 3 menit) supaya gampang monitor bot hidup/mati.
 */
export default function LiveUpdateBadge({ unix, label }: { unix?: number | null; label?: string | null }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000)
    return () => clearInterval(id)
  }, [])

  if (!unix) {
    return (
      <span style={badgeStyle('#8C7B6B', '#F5F5F5', '#E0E0E0')}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#B0B0B0', display: 'inline-block' }} />
        Menunggu update dari bot…
      </span>
    )
  }

  const diff = Math.max(0, now - unix)
  const rel = diff < 60 ? `${diff} dtk lalu`
    : diff < 3600 ? `${Math.floor(diff / 60)} mnt lalu`
    : diff < 86400 ? `${Math.floor(diff / 3600)} jam lalu`
    : `${Math.floor(diff / 86400)} hr lalu`
  const stale = diff > 180  // > 3 menit → bot kemungkinan berhenti
  const c = stale ? '#E8192C' : '#00A651'

  return (
    <span style={badgeStyle(c, stale ? '#FFF1F2' : '#E8FFF3', stale ? '#FECDD3' : '#A7F3D0')} title={`Data Fasih di-ingest: ${label ?? ''}`}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block', animation: stale ? 'none' : 'liveDot 1.4s ease-in-out infinite' }} />
      {stale ? '⚠ ' : ''}Update terakhir: {label} <span style={{ opacity: .8 }}>({rel})</span>
    </span>
  )
}

function badgeStyle(color: string, bg: string, border: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: bg, border: `1px solid ${border}`, color,
    borderRadius: 99, padding: '6px 12px', fontSize: 11, fontWeight: 700,
  }
}
