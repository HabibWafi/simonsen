'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import WaveLoop from '@/components/decor/WaveLoop'

const EASE = [0.22, 1, 0.36, 1] as const

export default function SPHubPage() {
  return (
    <>
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #1877F2 0%, #0E5BC4 100%)', padding: '64px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <WaveLoop position="top-right" size={400} opacity={0.22} variant="ribbon" />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span>
            <span style={{ color: 'white' }}>Sensus Penduduk</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,.18)', color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' as const }}>
              👨‍👩‍👧‍👦 Sensus Penduduk
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: 'white', lineHeight: 1.15, margin: '0 0 16px' }}>
              Sensus Penduduk BPS<br />Kabupaten Musi Rawas
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.9)', lineHeight: 1.75, maxWidth: 720, margin: 0 }}>
              Sensus Penduduk (SP) adalah kegiatan pendataan menyeluruh terhadap seluruh penduduk Indonesia. Mencakup demografi, sosial, ekonomi, dan kondisi tempat tinggal. Diselenggarakan setiap 10 tahun.
            </p>
          </motion.div>
        </div>
        <svg viewBox="0 0 1440 80" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#FAF8F5" />
        </svg>
      </section>

      {/* Coming Soon */}
      <section style={{ background: '#FAF8F5', padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' as const }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{ background: 'white', borderRadius: 20, padding: '48px 32px', border: '2px solid #E0F0FF', boxShadow: '0 12px 40px rgba(24,119,242,.10)' }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: '#FFF4E6', color: '#D97706', fontSize: 11, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase' as const, letterSpacing: .8 }}>
              ◯ Coming Soon
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A', marginBottom: 12 }}>SP 2030</h2>
            <p style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 1.7, marginBottom: 24 }}>
              Sensus Penduduk edisi berikutnya dijadwalkan pada <strong style={{ color: '#1877F2' }}>Mei 2030</strong>. Portal khusus SP 2030 akan dibuka mendekati waktu pelaksanaan.
            </p>
            <p style={{ fontSize: 13, color: '#8C7B6B', marginBottom: 28, fontStyle: 'italic' }}>
              Untuk data Sensus Penduduk 2020, kunjungi portal BPS Nasional.
            </p>
            <a href="https://sensus.bps.go.id/sp2020" target="_blank" rel="noopener noreferrer" style={{ padding: '12px 24px', borderRadius: 99, background: '#1877F2', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Data SP 2020 (BPS Nasional) ↗
            </a>
          </motion.div>
        </div>
      </section>
    </>
  )
}
