'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * NavbarRoot — dipakai di /, /sp, /st, /se (hub multi-sensus).
 * Identitas BPS neutral; accent biru / hijau / oren mengikuti sensus per-link.
 * Bukan untuk halaman dalam /se/2026/* — itu pakai NavbarSensus.
 */
const navLinks = [
  { href: '/',   label: 'Beranda',          accent: '#0F1E3D' },
  { href: '/sp', label: 'Sensus Penduduk',  accent: '#1877F2' },
  { href: '/st', label: 'Sensus Pertanian', accent: '#00A651' },
  { href: '/se', label: 'Sensus Ekonomi',   accent: '#E8751A' },
]

export default function NavbarRoot() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 1000,
        padding: scrolled ? '8px 16px 0' : '16px 20px 0',
        background: 'transparent',
        transition: 'padding .25s ease',
      }}>
        <div className="navbar-pill" style={{
          maxWidth: 1240, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: scrolled ? 'rgba(255,255,255,.92)' : '#FFFFFF',
          backdropFilter: scrolled ? 'blur(14px) saturate(160%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(160%)' : 'none',
          borderRadius: 99,
          padding: '8px 8px 8px 22px',
          height: scrolled ? 58 : 64,
          boxShadow: scrolled
            ? '0 10px 36px rgba(15,30,61,.18), 0 2px 6px rgba(0,0,0,.05)'
            : '0 6px 24px rgba(15,30,61,.10), 0 1px 2px rgba(0,0,0,.04)',
          border: '1px solid rgba(224,228,235,.7)',
          gap: 16,
          transition: 'all .28s cubic-bezier(.22,1,.36,1)',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', flexShrink: 0 }}>
            <Image src="/images/logo-bps.png" alt="BPS" width={42} height={42} priority style={{ width: scrolled ? 38 : 42, height: scrolled ? 38 : 42, objectFit: 'contain', transition: 'all .25s ease' }} />
            <div className="brand-divider" style={{ width: 1, height: 32, background: '#E0E4EB' }} />
            <div className="brand-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{
                fontSize: 15, fontWeight: 800, letterSpacing: '-.2px',
                background: 'linear-gradient(90deg, #1877F2 0%, #00A651 50%, #E8751A 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                color: 'transparent',
              }}>
                Portal Sensus BPS
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#8C95A8', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 }}>
                Kabupaten Musi Rawas
              </span>
            </div>
          </Link>

          <ul className="nav-desktop" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            listStyle: 'none', margin: 0, padding: 0,
          }}>
            {navLinks.map(link => {
              const active = isActive(link.href)
              return (
                <li key={link.href} style={{ position: 'relative' }}>
                  <Link href={link.href} style={{
                    position: 'relative',
                    display: 'block',
                    textDecoration: 'none',
                    color: active ? link.accent : '#3D3D3D',
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                    padding: '10px 14px',
                    transition: 'color .2s',
                  }} className={`nav-link nav-link-${link.href.replace('/','root')}`}>
                    {link.label}
                    {active && (
                      <span style={{
                        position: 'absolute', bottom: 2, left: '50%',
                        width: 20, height: 3, borderRadius: 3,
                        background: link.accent, transform: 'translateX(-50%)',
                      }} />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/se/2026/login" className="btn-login-root" style={{
              padding: '12px 22px',
              borderRadius: 99,
              background: '#0F1E3D',
              color: '#FFFFFF',
              fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(15,30,61,.30)',
              transition: 'background .2s, transform .15s',
              display: 'inline-block',
            }}>
              Login Petugas
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
              className="btn-hamburger"
              style={{
                display: 'none', flexDirection: 'column', gap: 5,
                background: '#F0F4FA', border: 'none', cursor: 'pointer',
                padding: 12, borderRadius: 99, width: 44, height: 44,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ display: 'block', width: 18, height: 2, background: '#0F1E3D', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: '#0F1E3D', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: '#0F1E3D', borderRadius: 2 }} />
            </button>
          </div>
        </div>

        <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              maxWidth: 1240, margin: '12px auto 0',
              background: '#FFFFFF',
              borderRadius: 20,
              padding: '12px 8px',
              boxShadow: '0 8px 32px rgba(15,30,61,.14)',
              border: '1px solid rgba(224,228,235,.7)',
            }}>
            {navLinks.map(link => {
              const active = isActive(link.href)
              return (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} style={{
                  display: 'block', padding: '14px 18px', borderRadius: 12,
                  textDecoration: 'none', fontSize: 15,
                  fontWeight: active ? 700 : 500,
                  color: active ? link.accent : '#1A1A1A',
                  background: active ? link.accent + '15' : 'transparent',
                  borderLeft: active ? `3px solid ${link.accent}` : '3px solid transparent',
                  margin: '2px 0',
                }}>
                  {link.label}
                </Link>
              )
            })}
            <Link href="/se/2026/login" onClick={() => setMobileOpen(false)} style={{
              display: 'block', margin: '8px 8px 0',
              padding: '14px 22px', borderRadius: 99,
              background: '#0F1E3D', color: 'white',
              fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 12px rgba(15,30,61,.30)',
            }}>
              Login Petugas
            </Link>
          </motion.div>
        )}
        </AnimatePresence>
      </header>

      <style>{`
        .nav-link:hover { color: #0F1E3D !important; }
        .btn-login-root:hover { background: #1a2b54 !important; transform: translateY(-1px); }
        @media (max-width: 900px) {
          .nav-desktop { display: none !important; }
          .btn-hamburger { display: flex !important; }
          .btn-login-root { display: none !important; }
          .brand-text > span:first-child { font-size: 13px !important; }
          .brand-text > span:last-child  { font-size: 9px !important; letter-spacing: 1px !important; }
          .brand-divider { height: 28px !important; }
        }
        @media (max-width: 420px) {
          .brand-text > span:first-child { font-size: 11.5px !important; }
          .brand-text > span:last-child  { font-size: 8.5px !important; }
        }
      `}</style>
    </>
  )
}
