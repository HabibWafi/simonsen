import Link from 'next/link'
import AnimatedSection from '@/components/AnimatedSection'
import WaveLoop from '@/components/decor/WaveLoop'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

type Anggota = { id: number; nama: string; peran: string; foto: string | null; tipe: string; nmkec: string | null }

const FALLBACK_STRUKTURAL: Anggota[] = [
  { id: -1, nama: 'Drs. Ahmad Fauzi, M.Si', peran: 'Kepala BPS Kab. Musi Rawas', foto: null, tipe: 'struktural', nmkec: null },
  { id: -2, nama: 'Siti Rahayu, S.ST', peran: 'Penanggung Jawab SE2026', foto: null, tipe: 'struktural', nmkec: null },
  { id: -3, nama: 'Budi Santoso, S.ST', peran: 'Koordinator Lapangan', foto: null, tipe: 'struktural', nmkec: null },
  { id: -4, nama: 'Dewi Lestari, S.ST', peran: 'Pengolah Data', foto: null, tipe: 'struktural', nmkec: null },
]

function initials(nama: string) {
  return nama.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

async function getTim(): Promise<{ struktural: Anggota[]; pj: Anggota[] }> {
  try {
    const [rows] = await pool.execute(
      `SELECT id, nama, peran, foto, tipe, nmkec FROM tim_se ORDER BY tipe, urutan, nama`,
    ) as [any[], any]
    const struktural = rows.filter(r => r.tipe === 'struktural')
    const pj = rows.filter(r => r.tipe === 'pj_kecamatan')
    return { struktural: struktural.length ? struktural : FALLBACK_STRUKTURAL, pj }
  } catch {
    return { struktural: FALLBACK_STRUKTURAL, pj: [] }
  }
}

export default async function TentangPage() {
  const { struktural, pj } = await getTim()
  return (
    <>
      {/* Hero */}
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', padding: '56px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 16px)' }} />
        <WaveLoop position="top-right" size={380} opacity={0.22} variant="ribbon" />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span><span style={{ color: 'white' }}>Tentang BPS</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'white', marginBottom: 12 }}>BPS Kabupaten Musi Rawas</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', maxWidth: 560 }}>Badan Pusat Statistik Kabupaten Musi Rawas — lembaga pemerintah non-kementerian yang bertanggung jawab di bidang kegiatan statistik di wilayah Kabupaten Musi Rawas.</p>
        </div>
        <svg viewBox="0 0 1440 80" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#FAF8F5" />
        </svg>
      </section>

      {/* About */}
      <section style={{ background: '#FAF8F5', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }} className="about-grid">

          <AnimatedSection direction="left" style={{ borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg, #FFF0DC, #F5EDE0)', height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EDE3D8', fontSize: 80 }}>
            🏛️
          </AnimatedSection>
          <AnimatedSection direction="right" delay={100}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8 }}>Profil Lembaga</p>
            <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 20 }}>Tentang BPS Kab. Musi Rawas</h2>
            <p style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 1.8, marginBottom: 16 }}>
              BPS Kabupaten Musi Rawas merupakan Unit Pelaksana Teknis BPS yang berkedudukan di Muara Beliti, Sumatera Selatan. Bertugas menyelenggarakan kegiatan statistik di wilayah Kabupaten Musi Rawas sesuai peraturan perundang-undangan yang berlaku.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
              {[
                { label: 'Visi', val: 'Penyedia data statistik berkualitas untuk Indonesia maju' },
                { label: 'Misi', val: 'Menyediakan statistik yang relevan, akurat, dan berkelanjutan' },
              ].map(v => (
                <div key={v.label} style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #EDE3D8' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase' as const, letterSpacing: .5, marginBottom: 6 }}>{v.label}</div>
                  <div style={{ fontSize: 13, color: '#3D3D3D', lineHeight: 1.6 }}>{v.val}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Tim SE2026 */}
      <section style={{ background: 'white', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <AnimatedSection style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8 }}>Pengelola</p>
            <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 40 }}>Tim SE2026 Musi Rawas</h2>
          </AnimatedSection>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }} className="tim-grid">
            {struktural.map((t, i) => (
              <AnimatedSection key={t.id} delay={i * 80} style={{ textAlign: 'center' as const, padding: 24, background: '#FAF8F5', borderRadius: 14, border: '1px solid #EDE3D8' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#E8751A,#C85E0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white', margin: '0 auto 14px' }}>
                  {t.foto ? <img src={t.foto} alt={t.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(t.nama)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>{t.nama}</div>
                <div style={{ fontSize: 12, color: '#6B6B6B' }}>{t.peran}</div>
              </AnimatedSection>
            ))}
          </div>

          {/* PJ Kecamatan */}
          {pj.length > 0 && (
            <div style={{ marginTop: 56 }}>
              <AnimatedSection style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8 }}>Penanggung Jawab Wilayah</p>
                <h3 style={{ fontSize: 'clamp(18px,2.4vw,26px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 32 }}>PJ Kecamatan SE2026</h3>
              </AnimatedSection>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 18 }}>
                {pj.map((t, i) => (
                  <AnimatedSection key={t.id} delay={i * 50} style={{ textAlign: 'center' as const, padding: 20, background: '#FAF8F5', borderRadius: 14, border: '1px solid #EDE3D8' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#E8751A,#C85E0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white', margin: '0 auto 12px' }}>
                      {t.foto ? <img src={t.foto} alt={t.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(t.nama)}
                    </div>
                    {t.nmkec && <div style={{ fontSize: 11, fontWeight: 700, color: '#C85E0A', textTransform: 'uppercase' as const, letterSpacing: .5, marginBottom: 4 }}>{t.nmkec}</div>}
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>{t.nama}</div>
                    <div style={{ fontSize: 11, color: '#6B6B6B' }}>{t.peran}</div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Kontak */}
      <section style={{ background: '#FAF8F5', padding: '72px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8, textAlign: 'center' as const }}>Lokasi & Kontak</p>
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 40, textAlign: 'center' as const }}>Hubungi Kami</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }} className="kontak-grid">
            <AnimatedSection direction="left" style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', padding: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 20 }}>Informasi Kontak</h3>
              {[
                { icon: '📍', label: 'Alamat', val: 'Jl. Lintas Sumatera No. 123, Muara Beliti, Musi Rawas 31600' },
                { icon: '📞', label: 'Telepon', val: '(0733) 123456' },
                { icon: '✉️', label: 'Email', val: 'bps1604@bps.go.id' },
                { icon: '💬', label: 'WhatsApp', val: '0812-3456-7890' },
                { icon: '🌐', label: 'Website', val: 'musirawaskab.bps.go.id' },
                { icon: '🕐', label: 'Jam Kerja', val: 'Senin–Jumat, 08:00–16:00 WIB' },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .3, marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 14, color: '#1A1A1A' }}>{c.val}</div>
                  </div>
                </div>
              ))}
            </AnimatedSection>

            {/* Map placeholder */}
            <AnimatedSection direction="right" delay={100} style={{ borderRadius: 14, background: 'linear-gradient(135deg, #FFF0DC, #F5EDE0)', border: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, minHeight: 300 }}>
              <span style={{ fontSize: 48 }}>📍</span>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#C85E0A' }}>BPS Kab. Musi Rawas</p>
              <p style={{ fontSize: 12, color: '#6B6B6B', textAlign: 'center' as const, maxWidth: 200 }}>Muara Beliti, Musi Rawas, Sumatera Selatan</p>
              <a href="https://maps.google.com/?q=BPS+Musi+Rawas" target="_blank" rel="noopener noreferrer" style={{ padding: '8px 18px', borderRadius: 8, background: '#E8751A', color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Buka di Google Maps
              </a>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .about-grid, .tim-grid, .kontak-grid { grid-template-columns: 1fr !important; }
          .tim-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </>
  )
}
