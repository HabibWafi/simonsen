'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { mockPosts } from '@/lib/mockData'
import WaveLoop from '@/components/decor/WaveLoop'

const TABS = ['Semua', 'Berita', 'Sosialisasi', 'Infografis', 'Video', 'Pengumuman'] as const
type Tab = typeof TABS[number]

const BADGE: Record<string, { bg: string; color: string }> = {
  berita:      { bg: '#FFF0DC', color: '#E8751A' },
  sosialisasi: { bg: '#E8FFF3', color: '#00A651' },
  infografis:  { bg: '#EFF6FF', color: '#1877F2' },
  video:       { bg: '#FDF4FF', color: '#9333EA' },
  pengumuman:  { bg: '#FFF1F2', color: '#E8192C' },
}
const ICON: Record<string, string> = { berita: '📰', sosialisasi: '📢', infografis: '📊', video: '🎬', pengumuman: '📌' }

export default function SosialisasiPage() {
  const [tab, setTab] = useState<Tab>('Semua')
  const [search, setSearch] = useState('')
  const [posts, setPosts] = useState<any[]>(mockPosts)

  useEffect(() => {
    fetch('/api/posts?limit=24')
      .then(r => r.json())
      .then(j => { if (Array.isArray(j?.data) && j.data.length) setPosts(j.data) })
      .catch(() => {})
  }, [])

  const filtered = posts.filter(p => {
    const matchTab = tab === 'Semua' || p.kategori === tab.toLowerCase()
    const matchSearch = search === '' || p.judul.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const featured = posts[0] ?? mockPosts[0]

  return (
    <>
      {/* Hero */}
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', padding: '56px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 16px)' }} />
        <WaveLoop position="top-right" size={380} opacity={0.22} variant="ribbon" />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span>
            <span style={{ color: 'white' }}>Sosialisasi & Berita</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'white', marginBottom: 12 }}>Berita & Sosialisasi</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', marginBottom: 28, maxWidth: 520 }}>
            Informasi terkini seputar pelaksanaan Sensus Ekonomi 2026 di Kabupaten Musi Rawas.
          </p>
          {/* Search bar */}
          <div style={{
            display: 'flex',
            maxWidth: 520,
            background: 'rgba(255,255,255,.96)',
            borderRadius: 99,
            padding: 6,
            boxShadow: '0 8px 28px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.08)',
            border: '1px solid rgba(255,255,255,.6)',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px 0 16px', fontSize: 16, color: '#C85E0A' }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari berita atau sosialisasi..."
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: 0,
                border: 'none',
                fontSize: 14,
                outline: 'none',
                background: 'transparent',
                color: '#1A1A1A',
              }}
            />
            <button style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg,#E8751A,#C85E0A)',
              color: 'white',
              border: 'none',
              borderRadius: 99,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(200,94,10,.35)',
              transition: 'transform .15s, box-shadow .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(200,94,10,.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(200,94,10,.35)' }}
            >
              Cari
            </button>
          </div>
        </div>
        <svg viewBox="0 0 1440 80" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#FAF8F5" />
        </svg>
      </section>

      <div style={{ background: '#FAF8F5', padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'start' }} className="sosial-layout">

          {/* Main content */}
          <div>
            {/* Featured article */}
            {!search && tab === 'Semua' && (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 24px rgba(232,117,26,.08)', marginBottom: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }} className="featured-card">
                <div style={{ background: 'linear-gradient(135deg, #FFF0DC, #F5EDE0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, minHeight: 240, overflow: 'hidden' }}>
                  {featured.thumbnail ? <img src={featured.thumbnail} alt={featured.judul} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (ICON[featured.kategori] ?? '📄')}
                </div>
                <div style={{ padding: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ background: '#FFF0DC', color: '#E8751A', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase' as const, letterSpacing: .5 }}>Artikel Pilihan</span>
                    <span style={{ background: BADGE[featured.kategori]?.bg, color: BADGE[featured.kategori]?.color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize' as const }}>{featured.kategori}</span>
                  </div>
                  <h2 style={{ fontSize: 'clamp(16px,2vw,22px)', fontWeight: 800, color: '#1A1A1A', lineHeight: 1.35, marginBottom: 12 }}>{featured.judul}</h2>
                  <p style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.7, marginBottom: 20 }}>{featured.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                      👤 {featured.author} · {new Date(featured.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <Link href={`/se/2026/sosialisasi/${featured.slug}`} style={{ padding: '9px 18px', borderRadius: 8, background: '#E8751A', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                      Baca Selengkapnya
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .2s',
                  background: tab === t ? '#E8751A' : 'white',
                  color: tab === t ? 'white' : '#3D3D3D',
                  boxShadow: tab === t ? '0 2px 8px rgba(232,117,26,.3)' : '0 1px 4px rgba(0,0,0,.06)',
                }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Content grid */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '48px 24px', color: '#6B6B6B' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <p>Tidak ada konten yang sesuai dengan pencarian Anda.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }} className="posts-grid">
                {filtered.map(post => {
                  const badge = BADGE[post.kategori] ?? BADGE.berita
                  const date = new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  return (
                    <article key={post.id} className="post-card" style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 12px rgba(232,117,26,.06)', transition: 'transform .2s, box-shadow .2s' }}>
                      <div style={{ height: 140, background: 'linear-gradient(135deg, #FFF0DC, #F5EDE0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, overflow: 'hidden' }}>
                        {post.thumbnail ? <img src={post.thumbnail} alt={post.judul} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (ICON[post.kategori] ?? '📄')}
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, textTransform: 'capitalize' as const }}>{post.kategori}</span>
                          <span style={{ fontSize: 11, color: '#6B6B6B', alignSelf: 'center' }}>{date}</span>
                        </div>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.45, marginBottom: 8 }}>{post.judul}</h3>
                        <p style={{ fontSize: 12, color: '#6B6B6B', lineHeight: 1.6, marginBottom: 12 }}>{post.excerpt.slice(0, 80)}…</p>
                        <Link href={`/se/2026/sosialisasi/${post.slug}`} style={{ fontSize: 12, fontWeight: 600, color: '#E8751A', textDecoration: 'none' }}>Baca selengkapnya →</Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            <div style={{ display: 'flex', gap: 8, marginTop: 32, justifyContent: 'center' }}>
              {[1, 2, 3].map(p => (
                <button key={p} style={{ width: 36, height: 36, borderRadius: 8, border: p === 1 ? 'none' : '1px solid #EDE3D8', background: p === 1 ? '#E8751A' : 'white', color: p === 1 ? 'white' : '#3D3D3D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
              <button style={{ padding: '0 12px', height: 36, borderRadius: 8, border: '1px solid #EDE3D8', background: 'white', color: '#3D3D3D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Berikutnya →
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Pengumuman */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', padding: 20, boxShadow: '0 2px 12px rgba(232,117,26,.06)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 16, textTransform: 'uppercase' as const, letterSpacing: .5 }}>📌 Pengumuman Terbaru</h4>
              {posts.filter(p => p.kategori === 'pengumuman').map(p => (
                <div key={p.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #EDE3D8' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4, marginBottom: 4 }}>{p.judul}</p>
                  <span style={{ fontSize: 11, color: '#6B6B6B' }}>{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
            </div>

            {/* Tag populer */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', padding: 20, boxShadow: '0 2px 12px rgba(232,117,26,.06)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 16, textTransform: 'uppercase' as const, letterSpacing: .5 }}>🏷️ Tag Populer</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['SE2026', 'BPS Musi Rawas', 'Pencacahan', 'Pelatihan', 'Jadwal', 'Sosialisasi'].map(tag => (
                  <span key={tag} style={{ background: '#FFF0DC', color: '#C85E0A', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 99, cursor: 'pointer' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Kontak BPS */}
            <div style={{ background: 'linear-gradient(135deg, #E8751A, #C85E0A)', borderRadius: 12, padding: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12 }}>📞 Hubungi BPS</h4>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginBottom: 12, lineHeight: 1.6 }}>
                Punya pertanyaan tentang SE2026? Hubungi BPS Kab. Musi Rawas:
              </p>
              <div style={{ fontSize: 12, color: 'white', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span>📞 (0733) 123456</span>
                <span>✉️ bps1604@bps.go.id</span>
                <span>💬 WA: 0812-3456-7890</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .post-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(232,117,26,.14) !important; }
        @media (max-width: 1024px) {
          .sosial-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .posts-grid { grid-template-columns: 1fr !important; }
          .featured-card { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
