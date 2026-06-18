import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import WaveLoop from '@/components/decor/WaveLoop'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

const BADGE: Record<string, { label: string; bg: string; color: string }> = {
  berita:      { label: 'Berita',      bg: '#FFF0DC', color: '#C85E0A' },
  sosialisasi: { label: 'Sosialisasi', bg: '#DCFCE7', color: '#15803D' },
  infografis:  { label: 'Infografis',  bg: '#EDE9FE', color: '#6D28D9' },
  video:       { label: 'Video',       bg: '#DBEAFE', color: '#1D4ED8' },
  pengumuman:  { label: 'Pengumuman',  bg: '#FEE2E2', color: '#B91C1C' },
}

type Post = {
  id: number; judul: string; slug: string; kategori: string
  excerpt: string | null; konten: string | null; thumbnail: string | null
  media_type: 'none' | 'image' | 'video'; video_url: string | null
  author: string; created_at: string
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const [rows] = await pool.execute(
      `SELECT id, judul, slug, kategori, excerpt, konten, thumbnail, media_type, video_url, author, created_at
       FROM posts WHERE slug = ? AND published = 1 LIMIT 1`, [slug],
    ) as [any[], any]
    return rows[0] ?? null
  } catch { return null }
}

async function getRelated(slug: string, kategori: string): Promise<Post[]> {
  try {
    const [rows] = await pool.execute(
      `SELECT slug, judul, created_at FROM posts WHERE slug <> ? AND kategori = ? AND published = 1 ORDER BY created_at DESC LIMIT 3`,
      [slug, kategori],
    ) as [any[], any]
    return rows as Post[]
  } catch { return [] }
}

type Props = { params: Promise<{ slug: string }> }

export default async function ArtikelPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const badge = BADGE[post.kategori] ?? BADGE.berita
  const body  = post.konten ?? post.excerpt ?? ''
  const related = await getRelated(slug, post.kategori)
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: id })

  const paragraphs = body.trim().split(/\n+/).map(l => l.trim()).filter(Boolean)

  return (
    <>
      {/* Hero */}
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', padding: '48px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 16px)' }} />
        <WaveLoop position="top-right" size={320} opacity={0.18} variant="ribbon" />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span>
            <Link href="/se/2026/sosialisasi" style={{ color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>Sosialisasi</Link>
            <span>›</span>
            <span style={{ color: 'white', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.judul}</span>
          </div>
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 99, background: 'rgba(255,255,255,.2)', color: 'white', fontSize: 12, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            {badge.label}
          </span>
          <h1 style={{ fontSize: 'clamp(22px,3.5vw,38px)', fontWeight: 800, color: 'white', lineHeight: 1.3, marginBottom: 20 }}>
            {post.judul}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
                {post.author.charAt(0)}
              </div>
              <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 14 }}>{post.author}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>•</span>
            <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 13 }}>{timeAgo}</span>
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>•</span>
            <span style={{ color: 'rgba(255,255,255,.75)', fontSize: 13 }}>
              {new Date(post.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
        <svg viewBox="0 0 1440 60" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,30 C480,60 960,0 1440,30 L1440,60 L0,60 Z" fill="#FAF8F5" />
        </svg>
      </section>

      {/* Content */}
      <section style={{ background: '#FAF8F5', padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'start' }} className="artikel-grid">

          <article style={{ background: 'white', borderRadius: 16, padding: '40px 44px', border: '1px solid #EDE3D8', boxShadow: '0 2px 16px rgba(0,0,0,.05)' }}>
            {/* Media hero: video embed atau thumbnail */}
            {post.media_type === 'video' && post.video_url ? (
              <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', marginBottom: 28, background: '#000' }}>
                <iframe src={post.video_url} title={post.judul} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
              </div>
            ) : post.thumbnail ? (
              <img src={post.thumbnail} alt={post.judul} style={{ width: '100%', borderRadius: 12, marginBottom: 28, objectFit: 'cover', maxHeight: 420 }} />
            ) : null}

            {/* Excerpt lead */}
            {post.excerpt && (
              <p style={{ fontSize: 17, lineHeight: 1.75, color: '#4A3728', fontWeight: 500, borderLeft: '4px solid #E8751A', marginBottom: 32, background: '#FFF8F0', padding: '16px 20px', borderRadius: '0 8px 8px 0' }}>
                {post.excerpt}
              </p>
            )}

            <div style={{ fontSize: 15, lineHeight: 1.85, color: '#3D3D3D' }}>
              {paragraphs.map((para, i) => {
                if (para.startsWith('## '))  return <h2 key={i} style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginTop: 36, marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #EDE3D8' }}>{para.replace('## ', '')}</h2>
                if (para.startsWith('### ')) return <h3 key={i} style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginTop: 28, marginBottom: 12 }}>{para.replace('### ', '')}</h3>
                if (para.startsWith('- '))   return <li key={i} style={{ marginLeft: 20, marginBottom: 8, listStyle: 'disc' }}>{para.replace('- ', '')}</li>
                if (/^\d+\./.test(para))      return <li key={i} style={{ marginLeft: 20, marginBottom: 8 }}>{para.replace(/^\d+\.\s*/, '')}</li>
                if (para.startsWith('| '))    return null
                return <p key={i} style={{ marginBottom: 20 }}>{para}</p>
              })}
            </div>

            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['SE2026', 'BPS Musi Rawas', badge.label].map(tag => (
                  <span key={tag} style={{ padding: '4px 12px', borderRadius: 99, background: badge.bg, color: badge.color, fontSize: 12, fontWeight: 600 }}>#{tag.replace(/ /g, '')}</span>
                ))}
              </div>
              <Link href="/se/2026/sosialisasi" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E8751A', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>← Kembali ke Sosialisasi</Link>
            </div>
          </article>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #EDE3D8' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#8C7B6B', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>Kategori</h3>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 99, background: badge.bg, color: badge.color, fontWeight: 700, fontSize: 14 }}>{badge.label}</span>
            </div>

            {related.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #EDE3D8' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#8C7B6B', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 16 }}>Artikel Terkait</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {related.map(r => (
                    <Link key={r.slug} href={`/se/2026/sosialisasi/${r.slug}`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #F5EDE0' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: badge.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>📄</div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4, marginBottom: 4 }}>{r.judul}</p>
                          <p style={{ fontSize: 12, color: '#8C7B6B' }}>{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', borderRadius: 12, padding: 24, color: 'white' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>❓</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Punya pertanyaan?</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', marginBottom: 16, lineHeight: 1.6 }}>Hubungi BPS Kabupaten Musi Rawas untuk informasi lebih lanjut tentang SE2026.</p>
              <a href="http://s.bps.go.id/AdminBPS1605" target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '10px 0', borderRadius: 8, background: 'rgba(255,255,255,.2)', color: 'white', textAlign: 'center', fontWeight: 700, fontSize: 14, textDecoration: 'none', border: '1px solid rgba(255,255,255,.3)' }}>WhatsApp Kami</a>
            </div>
          </aside>
        </div>
      </section>

      <style>{`@media (max-width: 1024px) { .artikel-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  )
}
