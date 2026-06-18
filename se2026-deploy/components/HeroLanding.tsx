'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import WaveLoop from '@/components/decor/WaveLoop'
import DotsPattern from '@/components/decor/DotsPattern'
import { jadwalTimeline } from '@/lib/mockData'

const EASE = [0.22, 1, 0.36, 1] as const
const TARGET_DATE = new Date('2026-08-31T00:00:00+07:00').getTime()

function getTimeLeft() {
  const diff = TARGET_DATE - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}
function pad(n: number) { return String(n).padStart(2, '0') }

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}
const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

export default function HeroLanding() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const reduce = useReducedMotion()
  const yDecor1 = useTransform(scrollY, [0, 400], [0, reduce ? 0 : -60])
  const yDecor2 = useTransform(scrollY, [0, 400], [0, reduce ? 0 : 40])
  const yMascot = useTransform(scrollY, [0, 400], [0, reduce ? 0 : -20])

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCountdown(getTimeLeft())
    const id = setInterval(() => setCountdown(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  const handlePelajariClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('apa-itu-se2026')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section
      ref={ref}
      style={{
        background: `
          radial-gradient(ellipse 60% 50% at 85% 18%, rgba(245,166,35,.22) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 10% 90%, rgba(232,117,26,.12) 0%, transparent 60%),
          radial-gradient(ellipse 80% 180px at 50% 0%, rgba(232,117,26,.06) 0%, transparent 70%),
          var(--cream)
        `,
        overflow: 'hidden', position: 'relative',
        marginTop: -96,
        paddingTop: 96,
      }}
    >
      {/* Parallax decor */}
      <motion.div style={{ y: yDecor1, position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <WaveLoop position="top-right" size={460} opacity={0.22} />
      </motion.div>
      <motion.div style={{ y: yDecor2, position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <DotsPattern position="bottom-left" size={280} opacity={0.18} style={{ bottom: 60, left: 20 }} />
      </motion.div>

      {/* ── HERO CONTENT 3-KOLOM ── */}
      <div
        className="hero-3col"
        style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '40px 24px 24px',
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr 1.2fr',
          gap: 32, alignItems: 'center',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* === KIRI — Copy === */}
        <motion.div variants={container} initial="hidden" animate="show" className="hero-col-text">
          <motion.div
            variants={fadeUp}
            whileHover={{ scale: 1.04 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#FFF0DC',
              border: '1px solid rgba(232,117,26,.25)',
              borderRadius: 99,
              padding: '6px 14px',
              color: '#C85E0A', fontSize: 12, fontWeight: 700,
              letterSpacing: .5, textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, .5, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 6, height: 6, background: '#E8751A', borderRadius: '50%', display: 'inline-block' }}
            />
            Sensus Ekonomi 2026
          </motion.div>

          <motion.h1
            variants={fadeUp}
            style={{
              fontSize: 'clamp(32px, 4.5vw, 64px)',
              fontWeight: 800, color: '#1A1A1A',
              lineHeight: 1.06, marginBottom: 18,
              letterSpacing: -1.2,
            }}
          >
            Mencatat Ekonomi<br />
            <em style={{
              fontStyle: 'normal',
              background: 'linear-gradient(135deg, #E8751A 0%, #F5A623 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Musi Rawas
            </em>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            style={{
              fontSize: 'clamp(14px, 1.2vw, 16px)',
              color: '#6B6B6B', lineHeight: 1.7,
              marginBottom: 32, maxWidth: 460,
            }}
          >
            Portal resmi Sensus Ekonomi 2026 Kabupaten Musi Rawas. Pantau progress pencacahan, jadwal kegiatan, dan informasi terbaru SE2026 di wilayah Musi Rawas.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link href="/se/2026/progress" style={{
                padding: '14px 26px',
                borderRadius: 99,
                background: 'linear-gradient(135deg, #E8751A 0%, #F5A623 100%)',
                color: 'white', fontSize: 14, fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 8px 22px rgba(232,117,26,.40)',
                display: 'inline-flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 16 }}>📊</span>
                Lihat Progress Wilayah
                <span aria-hidden style={{ display: 'inline-block' }}>›</span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <a href="#apa-itu-se2026" onClick={handlePelajariClick} style={{
                padding: '14px 26px',
                borderRadius: 99,
                background: 'rgba(255,255,255,.65)',
                color: '#E8751A',
                border: '1.5px solid rgba(232,117,26,.4)',
                fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                backdropFilter: 'blur(8px)',
              }}>
                <span style={{ fontSize: 16 }}>📖</span>
                Pelajari SE2026
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* === TENGAH — Bung Itung Mascot === */}
        <motion.div
          className="hero-col-mascot"
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', y: yMascot }}
        >
          {/* Glow stage-light di belakang */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(232,117,26,.18) 0%, transparent 70%)',
            filter: 'blur(20px)',
            zIndex: 0,
          }} />
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520 }}
          >
            <Image
              src="/images/mascot/bung-itung.png"
              alt="Bung Itung — Maskot SE2026"
              width={520}
              height={640}
              priority
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 28px 36px rgba(232,117,26,.28))',
              }}
            />
          </motion.div>
        </motion.div>

        {/* === KANAN — Schedule card glass dengan timeline === */}
        <motion.div
          className="hero-col-card"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
        >
          <div style={{
            background: 'rgba(255,255,255,.78)',
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            borderRadius: 22,
            padding: '24px 24px 20px',
            boxShadow: '0 18px 60px rgba(232,117,26,.22), 0 2px 8px rgba(0,0,0,.05)',
            border: '1px solid rgba(255,255,255,.7)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', letterSpacing: -.2 }}>Jadwal Kegiatan SE2026</p>
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  fontSize: 10, fontWeight: 800, color: 'white',
                  background: '#E8751A', padding: '4px 10px',
                  borderRadius: 99, letterSpacing: .5,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ width: 6, height: 6, background: 'white', borderRadius: '50%', display: 'inline-block' }} />
                LIVE
              </motion.span>
            </div>

            {/* Timeline items dengan connector garis */}
            <div style={{ position: 'relative' }}>
              {jadwalTimeline.slice(0, 4).map((item, i) => {
                const isLast = i === 3
                const dotColor = item.status === 'selesai' ? '#00A651' : item.status === 'aktif' ? '#E8751A' : '#EDE3D8'
                const lineColor = item.status === 'selesai' ? '#00A651' : item.status === 'aktif' ? '#E8751A' : '#EDE3D8'
                const lineColorNext = (jadwalTimeline[i + 1]?.status === 'selesai') ? '#00A651' : (jadwalTimeline[i + 1]?.status === 'aktif' ? '#E8751A' : '#EDE3D8')
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.1, duration: 0.5, ease: EASE }}
                    style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 12, paddingBottom: isLast ? 0 : 14 }}
                  >
                    {/* Kolom kiri — dot + connector line */}
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: dotColor, flexShrink: 0,
                        boxShadow: item.status === 'aktif' ? `0 0 0 4px rgba(232,117,26,.18)` : 'none',
                        animation: item.status === 'aktif' ? 'pulseDot 1.6s ease-in-out infinite' : 'none',
                        zIndex: 1, marginTop: 2,
                      }} />
                      {!isLast && (
                        <div style={{
                          flex: 1,
                          width: 2,
                          marginTop: 4,
                          background: `linear-gradient(180deg, ${lineColor} 0%, ${lineColorNext} 100%)`,
                          borderRadius: 2,
                          minHeight: 28,
                        }} />
                      )}
                    </div>
                    {/* Kolom kanan — konten */}
                    <div>
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        color: item.status === 'selesai' ? '#00A651' : '#C85E0A',
                        marginBottom: 2,
                      }}>{item.periode}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 3 }}>{item.judul}</div>
                      <div style={{ fontSize: 11, color: '#6B6B6B', lineHeight: 1.55 }}>{item.deskripsi.slice(0, 70)}…</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── COUNTDOWN BAR INTEGRATED ── */}
      <div className="hero-countdown-wrap" style={{ position: 'relative', zIndex: 1, marginTop: 24 }}>
        <div style={{
          background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)',
          padding: '24px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <WaveLoop position="top-right" size={280} opacity={0.12} variant="ribbon" style={{ top: -50, right: -20 }} />
          <DotsPattern position="bottom-left" size={180} opacity={0.15} style={{ bottom: -30, left: 100 }} />
          <div className="hero-cd-grid" style={{
            maxWidth: 1280, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            alignItems: 'center', gap: 24,
            position: 'relative', zIndex: 1,
          }}>
            {/* Kiri — title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,.18)',
                border: '1px solid rgba(255,255,255,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>🕐</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Hitung Mundur</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'white', letterSpacing: -.2 }}>Akhir Pendataan Door-to-Door</p>
              </div>
            </div>

            {/* Tengah — angka countdown */}
            <div className="hero-cd-nums" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[
                { val: countdown.days,    unit: 'HARI' },
                { val: countdown.hours,   unit: 'JAM' },
                { val: countdown.minutes, unit: 'MENIT' },
                { val: countdown.seconds, unit: 'DETIK' },
              ].map((item, i) => (
                <div key={item.unit} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {i > 0 && <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.45)' }}>:</span>}
                  <div style={{
                    background: 'rgba(0,0,0,.18)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    textAlign: 'center',
                    minWidth: 64,
                    border: '1px solid rgba(255,255,255,.12)',
                    overflow: 'hidden',
                  }}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div
                        key={item.val}
                        initial={{ y: 18, opacity: 0 }}
                        animate={{ y: 0, opacity: mounted ? 1 : 0.5 }}
                        exit={{ y: -18, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: -1 }}
                      >
                        {pad(item.val)}
                      </motion.div>
                    </AnimatePresence>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.75)', letterSpacing: .8, marginTop: 4 }}>{item.unit}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Kanan — CTA */}
            <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link href="/se/2026/tahapan" style={{
                padding: '12px 22px',
                borderRadius: 99,
                background: 'white',
                color: '#C85E0A',
                fontSize: 13, fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0,0,0,.15)',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span>📅</span>
                Lihat Tahapan
                <span aria-hidden>›</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 100% { box-shadow: 0 0 0 4px rgba(232,117,26,.2); }
          50%      { box-shadow: 0 0 0 7px rgba(232,117,26,.08); }
        }

        @media (max-width: 1100px) {
          .hero-3col { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
          .hero-col-mascot { display: none !important; }
        }
        @media (max-width: 900px) {
          .hero-3col { grid-template-columns: 1fr !important; gap: 28px !important; padding: 24px 20px 16px !important; align-items: start !important; }
          .hero-col-mascot { display: flex !important; max-width: 280px; margin: 0 auto; }
          .hero-cd-grid { grid-template-columns: 1fr !important; gap: 16px !important; justify-items: center; text-align: center; }
        }
        @media (max-width: 520px) {
          .hero-cd-nums { gap: 4px !important; flex-wrap: wrap; justify-content: center; }
          .hero-cd-nums > div > div { min-width: 56px !important; padding: 8px 10px !important; }
        }
      `}</style>
    </section>
  )
}
