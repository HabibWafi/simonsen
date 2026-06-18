import Link from 'next/link'
import Image from 'next/image'
import type { SensusConfig } from '@/types'
import { SOSMED_ICONS } from './sosmedIcons'

/**
 * FooterSensus — terima config sensus, render footer dengan nuansa warna sensus.
 * Dipakai di /se/2026/*, /sp/2030/*, dst.
 */
interface Props {
  config: SensusConfig
}

const sosmedColor: Record<string, string> = {
  facebook:  '#1877F2',
  instagram: '#E1306C',
  youtube:   '#FF0000',
  whatsapp:  '#25D366',
  twitter:   '#FFFFFF',
  tiktok:    '#69C9D0',
}

export default function FooterSensus({ config }: Props) {
  const primary = config.primary_color
  const secondary = config.secondary_color ?? primary
  const fc = config.footer_config

  return (
    <footer>
      {/* Top accent bar — warna primary sensus */}
      <div aria-hidden style={{
        height: 4,
        background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`,
      }} />

      <div style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${primary} 80%, #2a1402) 0%, color-mix(in srgb, ${secondary} 82%, #1e0e01) 100%)`, padding: '52px 24px 36px', color: 'white' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: `1.4fr repeat(${fc.kolomLinks.length || 1}, 1fr) 1fr`, gap: 36 }} className="footer-grid-s">

          {/* Brand cluster */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Image src="/images/logo-bps.png" alt="BPS" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: .92 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Badan Pusat Statistik</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Kabupaten Musi Rawas</div>
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', borderRadius: 99, padding: '4px 12px', marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: primary, display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: primary, textTransform: 'uppercase', letterSpacing: '1.4px' }}>{config.nama_pendek}</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.7, marginBottom: 14 }}>{fc.tagline}</p>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', lineHeight: 1.9 }}>
              📍 {fc.kontak.alamat}<br />
              📞 Telp/Faks: {fc.kontak.telp}<br />
              ✉️ {fc.kontak.email}
              {(fc.kontak as any).whatsapp && (
                <><br /><a href={(fc.kontak as any).whatsapp} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', textDecoration: 'none' }}>💬 WhatsApp Admin BPS</a></>
              )}
            </div>
          </div>

          {/* Kolom links dinamis */}
          {fc.kolomLinks.map((kolom, idx) => (
            <div key={idx}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: 'white', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>
                <span style={{ color: 'rgba(255,255,255,.85)' }}>●</span> {kolom.judul}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {kolom.items.map(item => (
                  <li key={item.href}>
                    <Link href={item.href} className="footer-link-s" style={{
                      color: 'rgba(255,255,255,.72)', textDecoration: 'none', fontSize: 13,
                    }}>
                      → {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Portal nasional + sosmed */}
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: 'white', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>Portal Nasional</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              <li><a href="https://bps.go.id" target="_blank" rel="noopener noreferrer" className="footer-link-s" style={{ color: 'rgba(255,255,255,.72)', textDecoration: 'none', fontSize: 13 }}>↗ bps.go.id</a></li>
              <li><a href="https://sensus.bps.go.id" target="_blank" rel="noopener noreferrer" className="footer-link-s" style={{ color: 'rgba(255,255,255,.72)', textDecoration: 'none', fontSize: 13 }}>↗ sensus.bps.go.id</a></li>
            </ul>

            {fc.sosmed.length > 0 && (
              <>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: 'white', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>Sosial Media</h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {fc.sosmed.map(s => {
                    const icon = SOSMED_ICONS[s.platform] ?? s.platform.slice(0, 2).toUpperCase()
                    const color = sosmedColor[s.platform] ?? primary
                    return (
                      <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer" title={s.platform} style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'rgba(255,255,255,.10)',
                        border: '1px solid rgba(255,255,255,.14)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', textDecoration: 'none',
                        transition: 'all .2s',
                        ['--sosmed-hover' as any]: color,
                      }} className="sosmed-btn-s">
                        {icon}
                      </a>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div style={{ background: `color-mix(in srgb, ${secondary} 70%, #160a00)`, padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', margin: 0 }}>{fc.copyright}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', margin: 0 }}>
            <a href="https://bps.go.id" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,.65)', textDecoration: 'none' }}>bps.go.id</a>
          </p>
        </div>
      </div>

      <style>{`
        .footer-link-s { transition: color .15s; }
        .footer-link-s:hover { color: white !important; }
        .sosmed-btn-s:hover { transform: translateY(-2px); background: var(--sosmed-hover) !important; border-color: var(--sosmed-hover) !important; }
        @media (max-width: 1100px) {
          .footer-grid-s { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
        }
        @media (max-width: 600px) {
          .footer-grid-s { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}</style>
    </footer>
  )
}
