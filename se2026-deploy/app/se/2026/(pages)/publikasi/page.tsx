import Link from 'next/link'

export default function PublikasiPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', padding: '56px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 16px)' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span><span style={{ color: 'white' }}>Publikasi Hasil</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'white', marginBottom: 12 }}>Publikasi Hasil SE2026</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', maxWidth: 520 }}>Hasil akhir Sensus Ekonomi 2026 Kabupaten Musi Rawas akan dipublikasikan pada Desember 2026.</p>
        </div>
        <svg viewBox="0 0 1440 80" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#FAF8F5" />
        </svg>
      </section>

      {/* Coming soon */}
      <section style={{ background: '#FAF8F5', padding: '120px 24px', textAlign: 'center' as const }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>📊</div>
          <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 16 }}>Hasil Belum Tersedia</h2>
          <p style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 1.75, marginBottom: 12 }}>
            Publikasi hasil Sensus Ekonomi 2026 Kabupaten Musi Rawas dijadwalkan pada <strong style={{ color: '#E8751A' }}>Desember 2026</strong>, setelah proses pengolahan dan validasi data selesai.
          </p>
          <p style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.75, marginBottom: 32 }}>
            Saat ini pencacahan sedang berlangsung. Pantau progress pencacahan di halaman <Link href="/se/2026/progress" style={{ color: '#E8751A', fontWeight: 600 }}>Progress</Link>.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/se/2026/progress" style={{ padding: '13px 28px', borderRadius: 8, background: '#E8751A', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(232,117,26,.35)' }}>
              Lihat Progress Pencacahan
            </Link>
            <a href="https://bps.go.id" target="_blank" rel="noopener noreferrer" style={{ padding: '13px 28px', borderRadius: 8, background: 'transparent', color: '#E8751A', border: '1.5px solid #E8751A', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Portal Nasional BPS
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
