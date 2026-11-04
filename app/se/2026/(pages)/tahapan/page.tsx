'use client'

import { useState } from 'react'
import Link from 'next/link'
import { kategoriUsaha } from '@/lib/mockData'
import WaveLoop from '@/components/decor/WaveLoop'
import type { Tahapan } from '@/types'
import { useTahapan } from '@/hooks/useTahapan'
import { pendataanStage } from '@/lib/tahapan'

const faqItems = [
  {
    q: 'Siapa yang wajib mengikuti Sensus Ekonomi 2026?',
    a: 'Seluruh usaha/perusahaan non-pertanian yang beroperasi di Indonesia, baik skala mikro, kecil, menengah, maupun besar. Termasuk pedagang, pengusaha jasa, industri, dan semua jenis usaha yang berlokasi di wilayah Kabupaten Musi Rawas.',
  },
  {
    q: 'Bagaimana cara berpartisipasi dalam SE2026?',
    a: 'Ada dua cara: (1) Mandiri online melalui portal resmi sensus.bps.go.id/se2026, (2) Menunggu kunjungan petugas BPS ke lokasi usaha Anda pada periode 15 Juni – 31 Agustus 2026. Data yang diberikan dijamin kerahasiaannya sesuai UU No. 16 Tahun 1997.',
  },
  {
    q: 'Apakah data yang diberikan aman dan rahasia?',
    a: 'Ya, sepenuhnya aman dan terjamin kerahasiaannya. BPS wajib menjaga kerahasiaan data individu/perusahaan berdasarkan Undang-Undang Statistik No. 16 Tahun 1997. Data hanya digunakan untuk kepentingan statistik nasional.',
  },
  {
    q: 'Berapa lama waktu yang dibutuhkan untuk mengisi kuesioner?',
    a: 'Pengisian kuesioner SE2026 hanya membutuhkan waktu sekitar 10-15 menit. Tersedia dalam format online (self-enumeration) maupun tatap muka dengan petugas BPS terlatih.',
  },
]

const statusColor: Record<string, { dot: string; badge_bg: string; badge_color: string; label: string }> = {
  selesai:       { dot: '#00A651', badge_bg: '#E8FFF3', badge_color: '#00A651', label: 'Selesai' },
  aktif:         { dot: '#E8751A', badge_bg: '#FFF0DC', badge_color: '#E8751A', label: 'Sedang Berjalan' },
  'akan-datang': { dot: '#EDE3D8', badge_bg: '#F5F5F5', badge_color: '#6B6B6B', label: 'Akan Datang' },
}

function TahapanCard({ item }: { item: Tahapan }) {
  const sc = statusColor[item.status] ?? statusColor['akan-datang']
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: 22, border: '1px solid #EDE3D8', boxShadow: '0 2px 16px rgba(232,117,26,.07)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#C85E0A', marginBottom: 6 }}>{item.periode}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{item.icon}</span> {item.judul}
      </div>
      <p style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.65, marginBottom: 12 }}>{item.deskripsi}</p>
      <span style={{ background: sc.badge_bg, color: sc.badge_color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, display: 'inline-block' }}>{sc.label}</span>

    </div>
  )
}

export default function TahapanPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { tahapan } = useTahapan()
  const pendataanSelesai = pendataanStage(tahapan)?.status === 'selesai'

  return (
    <>
      {/* Hero */}
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', padding: '56px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 16px)' }} />
        <WaveLoop position="top-right" size={380} opacity={0.22} variant="ribbon" />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span>
            <Link href="/se/2026" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>SE 2026</Link>
            <span>›</span>
            <span style={{ color: 'white' }}>Tahapan</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'white', marginBottom: 12, lineHeight: 1.2 }}>Tahapan Sensus Ekonomi 2026</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', lineHeight: 1.75, maxWidth: 640 }}>
            Rangkaian kegiatan SE2026 Kabupaten Musi Rawas dari sosialisasi hingga publikasi hasil. Status kegiatan diperbarui sesuai jadwal pelaksanaan.
          </p>
        </div>
        <svg viewBox="0 0 1440 80" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#FAF8F5" />
        </svg>
      </section>

      {/* Timeline alternating */}
      <section style={{ background: '#FAF8F5', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8, textAlign: 'center' as const }}>Alur Kegiatan</p>
          <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 48, textAlign: 'center' as const }}>
            {tahapan.length || 6} Tahap Pelaksanaan SE2026
          </h2>

          <div style={{ position: 'relative' }}>
            {/* Vertical center line */}
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, #EDE3D8 0%, #E8751A 30%, #E8751A 70%, #EDE3D8 100%)' }} className="timeline-line" />

            {tahapan.map((item, i) => {
              const sc = statusColor[item.status] ?? statusColor['akan-datang']
              const isRight = i % 2 === 0
              return (
                <div key={item.id} style={{ display: 'flex', gap: 0, alignItems: 'center', marginBottom: 36, position: 'relative' }} className="tl-row">
                  {/* Left side */}
                  <div className="tl-card" style={{ flex: 1, order: isRight ? 0 : 2, padding: isRight ? '0 56px 0 0' : '0 0 0 56px', display: 'flex', justifyContent: isRight ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: 420, width: '100%' }}><TahapanCard item={item} /></div>
                  </div>

                  {/* Center dot */}
                  <div className="tl-dot" style={{ order: 1, position: 'relative', zIndex: 2, flexShrink: 0 }}>
                    {item.status === 'aktif' && <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(232,117,26,.3)', animation: 'pulseRing 1.4s ease-out infinite' }} />}
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: sc.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'white', boxShadow: item.status !== 'akan-datang' ? `0 0 0 6px ${sc.dot}22` : 'none', border: '3px solid white' }}>
                      {item.status === 'selesai' ? '✓' : item.icon}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="tl-spacer" style={{ flex: 1, order: isRight ? 2 : 0 }} />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 18 Kategori Usaha */}
      <section style={{ background: '#E8751A', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.7)', marginBottom: 8, textAlign: 'center' as const }}>Cakupan SE2026</p>
          <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, color: 'white', marginBottom: 12, textAlign: 'center' as const }}>18 Kategori Lapangan Usaha</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.8)', textAlign: 'center' as const, maxWidth: 540, margin: '0 auto 40px' }}>
            Sensus Ekonomi 2026 mencakup seluruh kegiatan ekonomi non-pertanian di semua sektor berikut:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="kat-grid">
            {kategoriUsaha.map((k, i) => (
              <div key={k.nama} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,.15)', animation: `fadeUp .4s ease both ${i * .04}s` }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{k.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'white', lineHeight: 1.4 }}>{k.nama}</span>
              </div>
            ))}
          </div>
        </div>
        <style>{`@media (max-width: 768px) { .kat-grid { grid-template-columns: 1fr !important; } }`}</style>
      </section>

      {/* FAQ */}
      <section style={{ background: '#FAF8F5', padding: '80px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8, textAlign: 'center' as const }}>Pertanyaan Umum</p>
          <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 40, textAlign: 'center' as const }}>FAQ Tahapan SE2026</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqItems.map((item, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, border: `1px solid ${openFaq === i ? '#E8751A' : '#EDE3D8'}`, overflow: 'hidden', transition: 'border-color .2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: openFaq === i ? '#E8751A' : '#1A1A1A', lineHeight: 1.4, flex: 1, marginRight: 16 }}>{item.q}</span>
                  <span style={{ fontSize: 18, color: '#E8751A', transition: 'transform .2s', transform: openFaq === i ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', fontSize: 14, color: '#6B6B6B', lineHeight: 1.75 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#C85E0A', padding: '56px 24px', textAlign: 'center' as const }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: 'white', marginBottom: 14 }}>{pendataanSelesai ? 'Pendataan SE2026 Telah Selesai' : 'Siap Berpartisipasi dalam SE2026?'}</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.85)', marginBottom: 28 }}>{pendataanSelesai ? 'Terima kasih atas partisipasi Anda. Pantau perkembangan hasil pendataan SE2026 Kabupaten Musi Rawas.' : 'Daftarkan usaha Anda sekarang atau hubungi petugas BPS terdekat di Kabupaten Musi Rawas.'}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {pendataanSelesai ? <Link href="/se/2026/progress" style={{ padding: '13px 28px', borderRadius: 8, background: 'white', color: '#C85E0A', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Lihat Progress Wilayah</Link> : <a href="https://sensus.bps.go.id/se2026" target="_blank" rel="noopener noreferrer" style={{ padding: '13px 28px', borderRadius: 8, background: 'white', color: '#C85E0A', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Daftar Online Sekarang
            </a>}
            <Link href="/se/2026/faq" style={{ padding: '13px 28px', borderRadius: 8, background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,.6)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Lihat FAQ Lengkap
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .timeline-line { left: 24px !important; transform: none !important; }
          .tl-row { flex-direction: row !important; align-items: flex-start !important; padding-left: 0; }
          .tl-spacer { display: none !important; }
          .tl-card { flex: 1 !important; order: 2 !important; padding: 0 0 0 24px !important; justify-content: flex-start !important; min-width: 0; }
          .tl-dot { order: 1 !important; }
        }
      `}</style>
    </>
  )
}
