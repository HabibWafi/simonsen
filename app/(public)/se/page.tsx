'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import WaveLoop from '@/components/decor/WaveLoop'

const EASE = [0.22, 1, 0.36, 1] as const

interface Edisi {
  tahun: string
  label: string
  status: 'aktif' | 'rencana' | 'arsip'
  href: string | null
  catatan: string
}

const EDISI: Edisi[] = [
  { tahun: '2016', label: 'SE2016', status: 'arsip',   href: null,           catatan: 'Sensus Ekonomi 2016 — data tersedia di portal BPS Nasional' },
  { tahun: '2026', label: 'SE2026', status: 'aktif',   href: '/se/2026',     catatan: 'Sensus Ekonomi 2026 — sedang berlangsung' },
  { tahun: '2036', label: 'SE2036', status: 'rencana', href: null,           catatan: 'Sensus Ekonomi 2036 — dijadwalkan' },
]

export default function SEHubPage() {
  return (
    <>
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', padding: '64px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <WaveLoop position="top-right" size={400} opacity={0.22} variant="ribbon" />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span>
            <span style={{ color: 'white' }}>Sensus Ekonomi</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,.18)', color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' as const }}>
              🏪 Sensus Ekonomi
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: 'white', lineHeight: 1.15, margin: '0 0 16px' }}>
              Sensus Ekonomi BPS<br />Kabupaten Musi Rawas
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.9)', lineHeight: 1.75, maxWidth: 720, margin: 0 }}>
              Sensus Ekonomi (SE) adalah kegiatan pencacahan menyeluruh terhadap seluruh unit usaha/perusahaan non-pertanian di Indonesia. Diselenggarakan oleh BPS setiap 10 tahun untuk merekam struktur dan dinamika ekonomi nasional dan daerah.
            </p>
          </motion.div>
        </div>
        <svg viewBox="0 0 1440 80" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#FAF8F5" />
        </svg>
      </section>

      {/* Tentang SE */}
      <section style={{ background: '#FAF8F5', padding: '60px 24px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {[
            { icon: '🎯', title: 'Tujuan', body: 'Mendapatkan gambaran lengkap struktur ekonomi non-pertanian di seluruh wilayah Indonesia.' },
            { icon: '📋', title: 'Cakupan', body: '18 kategori lapangan usaha non-pertanian: perdagangan, jasa, industri, konstruksi, dll.' },
            { icon: '⏱️', title: 'Periodik', body: 'Diselenggarakan setiap 10 tahun. Edisi berikutnya: SE2026 (Maret – Desember 2026).' },
            { icon: '🔒', title: 'Kerahasiaan', body: 'Data pelaku usaha dijamin kerahasiaannya sesuai UU No. 16 Tahun 1997.' },
          ].map((c, i) => (
            <motion.div key={c.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
              style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid #EDE3D8' }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 6 }}>{c.title}</div>
              <p style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.6, margin: 0 }}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pilih Edisi */}
      <section style={{ background: 'white', padding: '60px 24px 100px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8, textAlign: 'center' as const }}>Pilih Edisi</p>
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 36, textAlign: 'center' as const }}>Edisi Sensus Ekonomi</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {EDISI.map((e, i) => {
              const isAktif = e.status === 'aktif'
              const isRencana = e.status === 'rencana'
              const Card = (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
                  whileHover={isAktif ? { y: -4, scale: 1.02 } : {}}
                  style={{
                    background: isAktif ? 'linear-gradient(135deg, #FFF8F0, #FFF0DC)' : 'white',
                    borderRadius: 16,
                    border: `2px solid ${isAktif ? '#E8751A' : '#EDE3D8'}`,
                    padding: 24, position: 'relative', overflow: 'hidden',
                    boxShadow: isAktif ? '0 10px 32px rgba(232,117,26,.2)' : '0 2px 8px rgba(0,0,0,.04)',
                    cursor: isAktif ? 'pointer' : 'default', opacity: !isAktif ? 0.7 : 1,
                  }}
                >
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 99,
                    background: isAktif ? '#00A651' : isRencana ? '#F5A623' : '#8C7B6B',
                    color: 'white', fontSize: 10, fontWeight: 700, marginBottom: 14,
                    textTransform: 'uppercase' as const, letterSpacing: .8,
                  }}>
                    {isAktif ? '● Aktif' : isRencana ? '◯ Rencana' : '○ Arsip'}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: isAktif ? '#E8751A' : '#3D3D3D', letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>
                    {e.tahun}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>{e.label}</div>
                  <p style={{ fontSize: 12, color: '#6B6B6B', lineHeight: 1.55, margin: '0 0 16px' }}>{e.catatan}</p>
                  {isAktif && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#E8751A' }}>
                      Buka Portal SE2026 →
                    </div>
                  )}
                </motion.div>
              )
              return e.href ? (
                <Link key={e.tahun} href={e.href} style={{ textDecoration: 'none' }}>{Card}</Link>
              ) : (
                <div key={e.tahun}>{Card}</div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
