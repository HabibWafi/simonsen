'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { mockPosts, kategoriUsaha, jadwalTimeline } from '@/lib/mockData'
import WaveLoop from '@/components/decor/WaveLoop'
import DotsPattern from '@/components/decor/DotsPattern'
import ChevronAccent from '@/components/decor/ChevronAccent'
import HeroLanding from '@/components/HeroLanding'
import ProgressLiveSection from '@/components/ProgressLiveSection'
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

/* ── Scroll animation hook ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ── Animated counter ── */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const { ref, inView } = useInView()
  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value, duration])
  return <span ref={ref}>{display.toLocaleString('id-ID')}</span>
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    selesai:       { bg: '#E8FFF3', color: '#00A651', label: 'Selesai' },
    aktif:         { bg: '#FFF0DC', color: '#E8751A', label: 'Sedang Berjalan' },
    'akan-datang': { bg: '#F5F5F5', color: '#6B6B6B', label: 'Akan Datang' },
  }
  const s = map[status] ?? map['akan-datang']
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, letterSpacing: .3 }}>
      {s.label}
    </span>
  )
}

export default function HomePage() {
  // null/[] = belum ada data nyata → komponen tampilkan loading, BUKAN angka dummy.
  const [stats, setStats] = useState<any>(null)
  const [progress, setProgress] = useState<any[]>([])

  useEffect(() => {
    const load = () => {
      fetch('/api/stats', { cache: 'no-store' }).then(r => r.json()).then(j => {
        if (j && typeof j.total_target === 'number') setStats(j)
      }).catch(() => {})
      fetch('/api/progress', { cache: 'no-store' }).then(r => r.json()).then(j => {
        if (Array.isArray(j?.data) && j.data.length) {
          setProgress(j.data.map((d: any, i: number) => ({
            id: d.id ?? i + 1,
            kecamatan: d.nmkec ?? d.kecamatan,
            target_usaha: d.target_usaha,
            realisasi: d.realisasi,
            petugas_count: d.petugas_count ?? 0,
            status: d.status ?? 'belum',
            persentase: d.persentase ?? 0,
          })))
        }
      }).catch(() => {})
    }
    load()
    const id = setInterval(() => { if (!document.hidden) load() }, 60000)   // realtime; skip saat tab background
    return () => clearInterval(id)
  }, [])

  const top5Progress = [...progress]
    .sort((a, b) => b.realisasi - a.realisasi)
    .slice(0, 5)

  return (
    <>
      {/* ── 1. HERO + countdown integrasi ── */}
      <HeroLanding />

      {/* ── 2. APA ITU SE2026 (target dari CTA "Pelajari SE2026") ── */}
      <ApaSection />

      {/* ── 3. TAHAPAN SE2026 ── */}
      <TimelineSection />

      {/* ── 4. PROGRESS REALTIME + STATS COMBINED (redesigned) ── */}
      <ProgressLiveSection progress={top5Progress} stats={stats} />

      {/* ── 5. BERITA TERKINI ── */}
      <BeritaSection />

      {/* ── 6. CTA BANNER ── */}
      <section style={{ background: '#F5EDE0', padding: '72px 24px', textAlign: 'center' as const, position: 'relative', overflow: 'hidden' }}>
        <WaveLoop position="bottom-right" size={360} opacity={0.18} />
        <DotsPattern position="top-left" size={220} opacity={0.18} style={{ top: 30, left: 30 }} />
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 12 }}>Berkontribusi</p>
          <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 14 }}>Apakah Usaha Anda Sudah Tercatat?</h2>
          <p style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 1.75, marginBottom: 32 }}>
            Bantu BPS Kabupaten Musi Rawas mendapatkan data ekonomi yang akurat dengan memastikan usaha Anda telah tercatat dalam Sensus Ekonomi 2026.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.a whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }} href="https://sensus.bps.go.id/se2026" target="_blank" rel="noopener noreferrer" style={{ padding: '14px 28px', borderRadius: 99, background: 'linear-gradient(135deg,#E8751A,#F5A623)', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 20px rgba(232,117,26,.38)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Daftar Online Sekarang
              <ChevronAccent inline size={16} opacity={0.95} />
            </motion.a>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-block' }}>
              <Link href="/se/2026/faq" style={{ padding: '14px 28px', borderRadius: 99, background: 'rgba(255,255,255,.6)', color: '#E8751A', border: '1.5px solid rgba(232,117,26,.4)', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block', backdropFilter: 'blur(8px)' }}>
                Tanya Jawab
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── CHATBOT BUBBLE ── */}
      <ChatbotBubble />

      <style>{`
        .btn-primary:hover { background: #C85E0A !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,117,26,.4) !important; }
        .btn-outline:hover { background: #FFF0DC !important; }
      `}</style>
    </>
  )
}

/* ── TIMELINE SECTION ── */
function TimelineSection() {
  const jadwal = [
    { id: 1, judul: 'Sosialisasi & Persiapan',   periode: 'Jan – Apr 2026',        status: 'selesai' },
    { id: 2, judul: 'Pelatihan Petugas',          periode: 'Apr – Mei 2026',        status: 'selesai' },
    { id: 3, judul: 'Pencacahan Online',          periode: 'Mei – Agt 2026',        status: 'aktif' },
    { id: 4, judul: 'Pendataan Door to Door',     periode: '15 Jun – 31 Agt 2026',  status: 'aktif' },
  ]
  return (
    <section style={{ background: '#FAF8F5', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8 }}>Jadwal Kegiatan</p>
        <h2 style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 10 }}>Tahapan SE2026</h2>
        <div style={{ width: 44, height: 4, background: '#E8751A', borderRadius: 2, marginBottom: 40 }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, position: 'relative' }} className="timeline-grid">
          <div style={{ position: 'absolute', top: 28, left: '12.5%', right: '12.5%', height: 2, background: '#EDE3D8', zIndex: 0 }} />
          {jadwal.map((item) => {
            const isSelesai = item.status === 'selesai'
            const isAktif = item.status === 'aktif'
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' as const, padding: '0 12px', position: 'relative', zIndex: 1 }}>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  {isAktif && <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid rgba(232,117,26,.3)', animation: 'pulseRing 1.4s ease-out infinite' }} />}
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: isSelesai ? '#00A651' : isAktif ? '#E8751A' : '#EDE3D8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: 'white',
                    boxShadow: isAktif ? '0 0 0 6px rgba(232,117,26,.15)' : 'none',
                  }}>
                    {isSelesai ? '✓' : isAktif ? '●' : item.id}
                  </div>
                </div>
                <StatusBadge status={item.status} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginTop: 10, marginBottom: 4 }}>{item.judul}</p>
                <p style={{ fontSize: 12, color: '#6B6B6B' }}>{item.periode}</p>
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center' as const, marginTop: 40 }}>
          <Link href="/se/2026/tahapan" style={{ padding: '12px 24px', borderRadius: 8, background: 'transparent', color: '#E8751A', border: '1.5px solid #E8751A', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Lihat Semua Tahapan →
          </Link>
        </div>
      </div>
      <style>{`@media (max-width: 768px) { .timeline-grid { grid-template-columns: repeat(2,1fr) !important; gap: 24px !important; } }`}</style>
    </section>
  )
}

/* ── APA ITU SE2026 ── */
function ApaSection() {
  const { ref, inView } = useInView()
  return (
    <section id="apa-itu-se2026" style={{ background: '#E8751A', padding: '72px 24px', scrollMarginTop: 100 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 800, color: 'white', marginBottom: 12 }}>
            Apa itu Sensus Ekonomi 2026?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', lineHeight: 1.75, maxWidth: 640, margin: '0 auto' }}>
            SE2026 adalah kegiatan pendataan menyeluruh seluruh usaha/perusahaan non-pertanian di Indonesia.
            Dilaksanakan 10 tahun sekali, bertujuan memperoleh data lengkap tentang{' '}
            <strong style={{ color: 'white' }}>struktur dan perkembangan ekonomi</strong> Indonesia hingga level kabupaten/kota.
          </p>
        </div>
        <div ref={ref} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {kategoriUsaha.map((k, i) => (
            <div key={k.nama} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,.15)', borderRadius: 99,
              padding: '8px 14px', fontSize: 13, color: 'white', fontWeight: 500,
              border: '1px solid rgba(255,255,255,.2)',
              animation: inView ? `fadeUp .4s ease both ${i * .04}s` : 'none',
              opacity: inView ? 1 : 0,
            }}>
              <span>{k.icon}</span>
              <span>{k.nama}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── BERITA TERKINI ── */
const BADGE: Record<string, { bg: string; color: string }> = {
  berita:      { bg: '#FFF0DC', color: '#E8751A' },
  sosialisasi: { bg: '#E8FFF3', color: '#00A651' },
  infografis:  { bg: '#EFF6FF', color: '#1877F2' },
  video:       { bg: '#FDF4FF', color: '#9333EA' },
  pengumuman:  { bg: '#FFF1F2', color: '#E8192C' },
}
const ICON: Record<string, string> = { berita: '📰', sosialisasi: '📢', infografis: '📊', video: '🎬', pengumuman: '📌' }

function BeritaSection() {
  const [posts, setPosts] = useState<any[]>(mockPosts.slice(0, 3))
  useEffect(() => {
    fetch('/api/posts?limit=3')
      .then(r => r.json())
      .then(j => { if (Array.isArray(j?.data) && j.data.length) setPosts(j.data) })
      .catch(() => {})
  }, [])
  return (
    <section style={{ background: '#FAF8F5', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8 }}>Terbaru</p>
            <h2 style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 800, color: '#1A1A1A' }}>Berita & Sosialisasi</h2>
          </div>
          <Link href="/se/2026/sosialisasi" style={{ fontSize: 14, fontWeight: 600, color: '#E8751A', textDecoration: 'none' }}>Lihat Semua →</Link>
        </div>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }} className="posts-grid"
        >
          {posts.map(post => {
            const badge = BADGE[post.kategori] ?? BADGE.berita
            const date = new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            return (
              <motion.article
                key={post.id}
                variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                whileHover={{ y: -6, boxShadow: '0 12px 44px rgba(232,117,26,.20)' }}
                style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(232,117,26,.07)' }}
              >
                <div style={{ height: 160, background: 'linear-gradient(135deg, #FFF0DC 0%, #F5EDE0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden' }}>
                  {post.thumbnail ? <img src={post.thumbnail} alt={post.judul} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (ICON[post.kategori] ?? '📄')}
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, textTransform: 'capitalize' as const }}>{post.kategori}</span>
                    <span style={{ fontSize: 11, color: '#6B6B6B' }}>{date}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.45, marginBottom: 8 }}>{post.judul}</h3>
                  <p style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.65, marginBottom: 16 }}>{post.excerpt.slice(0, 100)}…</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6B6B6B' }}>👤 {post.author}</span>
                    <Link href={`/se/2026/sosialisasi/${post.slug}`} style={{ fontSize: 13, fontWeight: 600, color: '#E8751A', textDecoration: 'none' }}>Baca →</Link>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
      <style>{`
        @media (max-width: 768px) { .posts-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  )
}

/* ── CHATBOT BUBBLE ── */
function ChatbotBubble() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.92 }}
          transition={{ duration: 0.25, ease: EASE }}
          style={{ position: 'fixed', bottom: 88, right: 24, zIndex: 998, width: 320, background: 'white', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,.15)', border: '1px solid #EDE3D8', transformOrigin: 'bottom right' }}
        >
          <div style={{ background: '#E8751A', padding: '16px 20px', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Asisten SE2026</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, background: '#4ADE80', borderRadius: '50%', display: 'inline-block' }} /> Online
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ padding: 16, minHeight: 120 }}>
            <div style={{ background: '#FFF0DC', borderRadius: '4px 12px 12px 12px', padding: '10px 14px', fontSize: 13, color: '#1A1A1A', maxWidth: '85%', marginBottom: 12 }}>
              Halo! Saya Asisten SE2026 Musi Rawas. Ada yang bisa saya bantu? 😊
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Apa itu SE2026?', 'Jadwal pencacahan', 'Cara daftar online'].map(q => (
                <Link key={q} href="/se/2026/faq" style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid #E8751A', color: '#E8751A', fontSize: 11, fontWeight: 600, textDecoration: 'none', background: 'white' }}>
                  {q}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #EDE3D8' }}>
            <Link href="/se/2026/faq" style={{ display: 'block', textAlign: 'center' as const, padding: 10, background: '#E8751A', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Buka Halaman FAQ →
            </Link>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.92 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
        title="Tanya Asisten SE2026"
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, width: 56, height: 56, borderRadius: '50%', background: '#E8751A', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(232,117,26,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}
      >
        {open ? '✕' : '💬'}
      </motion.button>
    </>
  )
}
