'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

interface SensusCard {
  kode: 'sp' | 'st' | 'se'
  nama: string
  singkatan: string
  icon: string
  warna: string
  warnaBg: string
  deskripsi: string
  cakupan: string
  tahunAktif: string | null
  tahunNext: string
  href: string
}

const SENSUS: SensusCard[] = [
  {
    kode: 'sp',
    nama: 'Sensus Penduduk',
    singkatan: 'SP',
    icon: '👨‍👩‍👧‍👦',
    warna: '#1877F2',
    warnaBg: 'rgba(24,119,242,.08)',
    deskripsi: 'Pendataan menyeluruh penduduk Indonesia: demografi, sosial, dan ekonomi rumah tangga. Diselenggarakan setiap 10 tahun.',
    cakupan: 'Seluruh penduduk',
    tahunAktif: null,
    tahunNext: '2030',
    href: '/sp',
  },
  {
    kode: 'st',
    nama: 'Sensus Pertanian',
    singkatan: 'ST',
    icon: '🌾',
    warna: '#00A651',
    warnaBg: 'rgba(0,166,81,.08)',
    deskripsi: 'Pendataan rumah tangga pertanian, peternakan, perikanan, kehutanan, dan jasa pertanian. Diselenggarakan setiap 10 tahun.',
    cakupan: 'Rumah tangga pertanian',
    tahunAktif: null,
    tahunNext: '2033',
    href: '/st',
  },
  {
    kode: 'se',
    nama: 'Sensus Ekonomi',
    singkatan: 'SE',
    icon: '🏪',
    warna: '#E8751A',
    warnaBg: 'rgba(232,117,26,.08)',
    deskripsi: 'Pendataan seluruh unit usaha/perusahaan non-pertanian: skala mikro, kecil, menengah, hingga besar. Diselenggarakan setiap 10 tahun.',
    cakupan: '18 kategori usaha non-pertanian',
    tahunAktif: '2026',
    tahunNext: '2036',
    href: '/se',
  },
]

export default function RootLandingPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', padding: '90px 24px 50px', background: 'linear-gradient(180deg, #F8F9FB 0%, #FFFFFF 60%, #F0F4FA 100%)', overflow: 'hidden' }}>
        {/* 3-color mesh blobs */}
        <div aria-hidden style={{ position: 'absolute', top: -120, left: '-10%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(24,119,242,.22) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', top: 80, right: '-8%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,81,.18) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: -150, left: '40%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,117,26,.18) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' as const }}>
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 99,
              background: 'rgba(15,30,61,.06)', color: '#0F1E3D',
              fontSize: 11, fontWeight: 700, letterSpacing: 1.2, marginBottom: 20, textTransform: 'uppercase' as const,
              border: '1px solid rgba(15,30,61,.1)',
            }}
          >
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1877F2' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00A651' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E8751A' }} />
            </span>
            Portal Resmi BPS Kabupaten Musi Rawas
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            style={{ fontSize: 'clamp(34px, 5.5vw, 60px)', fontWeight: 900, color: '#0F1E3D', lineHeight: 1.1, margin: '0 0 18px', letterSpacing: -1.2 }}
          >
            Portal Sensus<br />
            <span style={{
              background: 'linear-gradient(90deg, #1877F2 0%, #00A651 50%, #E8751A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              BPS Musi Rawas
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
            style={{ fontSize: 17, color: '#4A5568', maxWidth: 700, margin: '0 auto 32px', lineHeight: 1.75 }}
          >
            Tiga sensus utama Badan Pusat Statistik untuk merekam wajah ekonomi dan demografi Indonesia. Pilih sensus untuk melihat informasi, jadwal, dan progress di Kabupaten Musi Rawas.
          </motion.p>

          {/* CTA secondary — login */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link href="/se/2026/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 99,
              background: '#0F1E3D', color: 'white',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 18px rgba(15,30,61,.25)',
              transition: 'all .2s',
            }} className="btn-login-navy">
              🔐 Login Petugas
            </Link>
            <a href="https://bps.go.id" target="_blank" rel="noopener noreferrer" style={{
              padding: '12px 24px', borderRadius: 99,
              background: 'rgba(255,255,255,.6)', color: '#0F1E3D',
              border: '1.5px solid rgba(15,30,61,.15)',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              backdropFilter: 'blur(8px)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              bps.go.id ↗
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── 3 SENSUS CARDS ─── */}
      <section style={{ background: 'white', padding: '20px 24px 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#4A5568', textAlign: 'center', marginBottom: 8 }}
          >
            Pilih Sensus
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#0F1E3D', textAlign: 'center', marginBottom: 40 }}
          >
            Tiga Sensus Strategis BPS
          </motion.h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {SENSUS.map((s, i) => (
              <motion.div
                key={s.kode}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <Link href={s.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{
                    background: 'white',
                    border: '1.5px solid #E4E8EE',
                    borderRadius: 20,
                    padding: 28,
                    height: '100%',
                    boxShadow: '0 4px 16px rgba(15,30,61,.04)',
                    transition: 'all .3s',
                    position: 'relative',
                    overflow: 'hidden',
                    ['--card-accent' as any]: s.warna,
                  }} className="sensus-card">
                    {/* Top accent bar (warna sensus) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: s.warna, borderRadius: '20px 20px 0 0' }} />

                    {/* Background icon huge */}
                    <div style={{ position: 'absolute', top: -10, right: -20, fontSize: 180, opacity: 0.04, pointerEvents: 'none' }}>{s.icon}</div>

                    {/* Status badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 12px', borderRadius: 99,
                      background: s.tahunAktif ? '#E8FFF3' : 'rgba(74,85,104,.08)',
                      color: s.tahunAktif ? '#00A651' : '#4A5568',
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .8,
                      marginBottom: 20, marginTop: 8,
                    }}>
                      {s.tahunAktif
                        ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00A651', display: 'inline-block', animation: 'rootPulse 1.6s ease-out infinite' }} /> AKTIF — {s.tahunAktif}</>
                        : <>● Berikutnya {s.tahunNext}</>
                      }
                    </div>

                    {/* Icon */}
                    <div style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: s.warnaBg, color: s.warna,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 30, marginBottom: 18,
                    }}>
                      {s.icon}
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 700, color: s.warna, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 4 }}>
                      {s.singkatan} — {s.tahunAktif ?? s.tahunNext}
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0F1E3D', margin: '0 0 12px', lineHeight: 1.2 }}>{s.nama}</h3>
                    <p style={{ fontSize: 14, color: '#4A5568', lineHeight: 1.65, marginBottom: 16 }}>{s.deskripsi}</p>

                    <div style={{ padding: '10px 12px', background: '#F8F9FB', borderRadius: 10, marginBottom: 18, border: '1px solid #E4E8EE' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase' as const, letterSpacing: .8, marginBottom: 2 }}>Cakupan</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F1E3D' }}>{s.cakupan}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E4E8EE', paddingTop: 14 }}>
                      <span style={{ fontSize: 13, color: s.warna, fontWeight: 700 }}>Kunjungi →</span>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{s.tahunAktif ? 'Konten aktif' : 'Coming Soon'}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INFO SECTION ─── */}
      <section style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FB 100%)', padding: '60px 24px 100px', position: 'relative' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { icon: '📋', title: 'Data Resmi BPS', body: 'Hasil sensus adalah data statistik nasional resmi sesuai UU No. 16 Tahun 1997.', warna: '#1877F2' },
            { icon: '🔒', title: 'Kerahasiaan Terjamin', body: 'Data individu dan perusahaan dijamin kerahasiaannya sepenuhnya.', warna: '#00A651' },
            { icon: '⏰', title: 'Siklus 10 Tahun', body: 'Setiap sensus diselenggarakan periodik untuk pemutakhiran data nasional.', warna: '#E8751A' },
            { icon: '🗺️', title: 'Cakupan Musi Rawas', body: 'Mencakup seluruh 14 kecamatan dan 199 desa di Kabupaten Musi Rawas.', warna: '#0F1E3D' },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
              style={{ background: 'white', borderRadius: 14, padding: 22, border: '1px solid #E4E8EE', boxShadow: '0 2px 8px rgba(15,30,61,.04)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${c.warna}15`, color: c.warna, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 }}>
                {c.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F1E3D', marginBottom: 6 }}>{c.title}</div>
              <p style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.6, margin: 0 }}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <style>{`
        .sensus-card:hover {
          border-color: var(--card-accent) !important;
          box-shadow: 0 16px 44px rgba(15,30,61,.12) !important;
          transform: translateY(-2px);
        }
        .btn-login-navy:hover { background: #1E2E55 !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(15,30,61,.35) !important; }
        @keyframes rootPulse { 0%{ opacity:1; transform:scale(1); } 50%{ opacity:.5; transform:scale(1.4); } 100%{ opacity:1; transform:scale(1); } }
      `}</style>
    </>
  )
}
