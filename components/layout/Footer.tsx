import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer>
      {/* 3-color top stripe (BPS multi-sensus identity: biru SP, hijau ST, oranye SE) */}
      <div aria-hidden style={{
        height: 4,
        background: 'linear-gradient(90deg, #1877F2 0% 33%, #00A651 33% 66%, #E8751A 66% 100%)',
      }} />

      {/* Main footer — dark navy BPS */}
      <div style={{ background: '#0F1E3D', padding: '56px 24px 40px', color: 'white' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 36 }} className="footer-grid">

          {/* Col 1: Identitas BPS */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Image src="/images/logo-bps.png" alt="BPS" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: .92 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Badan Pusat Statistik</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Kabupaten Musi Rawas</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.7, marginBottom: 14 }}>
              Jl. Lintas Sumatera No. 123<br />
              Muara Beliti, Musi Rawas<br />
              Sumatera Selatan 31600
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.7 }}>
              <span style={{ color: '#1877F2' }}>📞</span> (0733) 123456<br />
              <span style={{ color: '#1877F2' }}>✉️</span> bps1604@bps.go.id
            </p>
          </div>

          {/* Col 2: Sensus */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: 'white', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>Sensus</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { href: '/sp', label: 'Sensus Penduduk',   year: '2030', color: '#1877F2' },
                { href: '/st', label: 'Sensus Pertanian',  year: '2033', color: '#00A651' },
                { href: '/se', label: 'Sensus Ekonomi',    year: '2026', color: '#E8751A' },
              ].map(s => (
                <li key={s.href}>
                  <Link href={s.href} className="footer-link" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    color: 'rgba(255,255,255,.78)', textDecoration: 'none',
                    fontSize: 13, padding: '4px 0',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 0 0 3px ${s.color}22` }} />
                    <span style={{ flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{s.year}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Tautan SE2026 */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: 'white', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span style={{ color: '#E8751A' }}>●</span> SE 2026
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { href: '/se/2026',             label: 'Beranda SE2026' },
                { href: '/se/2026/tahapan',     label: 'Tahapan' },
                { href: '/se/2026/progress',    label: 'Progress' },
                { href: '/se/2026/sosialisasi', label: 'Sosialisasi' },
                { href: '/se/2026/faq',         label: 'FAQ' },
                { href: '/se/2026/publikasi',   label: 'Publikasi' },
                { href: '/se/2026/tentang',     label: 'Tentang' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link" style={{
                    color: 'rgba(255,255,255,.7)', textDecoration: 'none',
                    fontSize: 13,
                  }}>
                    → {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Portal & Sosmed */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: 'white', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>Portal Nasional</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
              {[
                { href: 'https://bps.go.id', label: 'bps.go.id' },
                { href: 'https://sensus.bps.go.id', label: 'sensus.bps.go.id' },
                { href: '/login', label: 'Login Petugas', internal: true },
              ].map(link => (
                <li key={link.href}>
                  {link.internal ? (
                    <Link href={link.href} className="footer-link" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontSize: 13 }}>
                      🔐 {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="footer-link" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontSize: 13 }}>
                      ↗ {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <h4 style={{ fontSize: 12, fontWeight: 800, color: 'white', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>Sosial Media</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'FB', color: '#1877F2', href: 'https://facebook.com/bpsmusirawas' },
                { label: 'IG', color: '#E1306C', href: 'https://instagram.com/bpsmusirawas' },
                { label: 'YT', color: '#FF0000', href: 'https://youtube.com/@bpsmusirawas' },
                { label: 'X',  color: '#FFFFFF', href: 'https://x.com/bpsmusirawas' },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: s.color, textDecoration: 'none',
                  transition: 'all .2s',
                }} className="sosmed-btn">
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div style={{ background: '#0A1428', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', margin: 0 }}>
            © 2026 BPS Kabupaten Musi Rawas — Portal Sensus
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', margin: 0 }}>
            Dibangun dengan rapi · <a href="https://bps.go.id" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'none' }}>bps.go.id</a>
          </p>
        </div>
      </div>

      <style>{`
        .footer-link { transition: color .15s; }
        .footer-link:hover { color: white !important; }
        .sosmed-btn:hover { background: rgba(255,255,255,.15) !important; transform: translateY(-2px); }
        @media (max-width: 1000px) {
          .footer-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
        }
        @media (max-width: 540px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}</style>
    </footer>
  )
}
