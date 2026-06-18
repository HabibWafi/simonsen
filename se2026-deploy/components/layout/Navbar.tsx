'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

// Nav variant SE2026 — muncul saat user di /se/2026/*
const navSE2026 = [
  { href: '/se/2026',             label: 'Beranda' },
  { href: '/se/2026/tahapan',     label: 'Tahapan' },
  { href: '/se/2026/progress',    label: 'Progress' },
  { href: '/se/2026/sosialisasi', label: 'Sosialisasi' },
  { href: '/se/2026/faq',         label: 'FAQ' },
  { href: '/se/2026/tentang',     label: 'Tentang' },
]

// Nav variant root — muncul di /, /sp, /st, /se (hub)
const navRoot = [
  { href: '/',    label: 'Beranda' },
  { href: '/sp',  label: 'Sensus Penduduk' },
  { href: '/st',  label: 'Sensus Pertanian' },
  { href: '/se',  label: 'Sensus Ekonomi' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const inSE2026 = pathname.startsWith('/se/2026')
  const navLinks = inSE2026 ? navSE2026 : navRoot

  const isActive = (href: string) => {
    if (href === '/' || href === '/se/2026') return pathname === href
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
          background: scrolled ? 'rgba(255,255,255,.88)' : '#FFFFFF',
          backdropFilter: scrolled ? 'blur(14px) saturate(160%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(160%)' : 'none',
          borderRadius: 99,
          padding: '8px 8px 8px 22px',
          height: scrolled ? 58 : 64,
          boxShadow: scrolled
            ? '0 10px 36px rgba(232,117,26,.18), 0 2px 6px rgba(0,0,0,.05)'
            : '0 6px 24px rgba(232,117,26,.10), 0 1px 2px rgba(0,0,0,.04)',
          border: '1px solid rgba(237,227,216,.7)',
          gap: 16,
          transition: 'all .28s cubic-bezier(.22,1,.36,1)',
        }}>
          {/* Brand cluster */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', flexShrink: 0 }}>
            <Image src="/images/logo-bps.png" alt="BPS" width={42} height={42} style={{ width: scrolled ? 38 : 42, height: scrolled ? 38 : 42, objectFit: 'contain', transition: 'all .25s ease' }} />
            <div className="brand-divider" style={{ width: 1, height: 32, background: '#EDE3D8' }} />
            <div className="brand-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#E8751A', letterSpacing: '-.2px' }}>
                Badan Pusat Statistik
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#8C7B6B', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 }}>
                Kabupaten Musi Rawas
              </span>
            </div>
          </Link>

          {/* Nav links — desktop */}
          <ul className="nav-desktop" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            listStyle: 'none', margin: 0, padding: 0,
          }}>
            {navLinks.map(link => {
              const active = isActive(link.href)
              return (
                <li key={link.href} style={{ position: 'relative' }}>
                  <Link href={link.href} className={active ? 'nav-link-active' : 'nav-link'} style={{
                    position: 'relative',
                    display: 'block',
                    textDecoration: 'none',
                    color: active ? '#E8751A' : '#3D3D3D',
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                    padding: '10px 14px',
                    transition: 'color .2s',
                  }}>
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Right cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" className="btn-login" style={{
              padding: '12px 22px',
              borderRadius: 99,
              background: '#E8751A',
              color: '#FFFFFF',
              fontSize: 13, fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(232,117,26,.30)',
              transition: 'background .2s, transform .15s',
              display: 'inline-block',
            }}>
              Login Petugas
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
              className="btn-hamburger"
              style={{
                display: 'none', flexDirection: 'column', gap: 5,
                background: '#FFF0DC', border: 'none', cursor: 'pointer',
                padding: 12, borderRadius: 99, width: 44, height: 44,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ display: 'block', width: 18, height: 2, background: '#C85E0A', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: '#C85E0A', borderRadius: 2 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: '#C85E0A', borderRadius: 2 }} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-dropdown"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              maxWidth: 1240, margin: '12px auto 0',
              background: '#FFFFFF',
              borderRadius: 20,
              padding: '12px 8px',
              boxShadow: '0 8px 32px rgba(232,117,26,.14)',
              border: '1px solid rgba(237,227,216,.6)',
            }}>
            {navLinks.map(link => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'block',
                    padding: '14px 18px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontSize: 15,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#E8751A' : '#1A1A1A',
                    background: active ? '#FFF0DC' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
            <Link href="/login" onClick={() => setMobileOpen(false)} style={{
              display: 'block', margin: '8px 8px 0',
              padding: '14px 22px',
              borderRadius: 99,
              background: '#E8751A',
              color: 'white',
              fontSize: 14, fontWeight: 700,
              textDecoration: 'none',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(232,117,26,.30)',
            }}>
              Login Petugas
            </Link>
          </motion.div>
        )}
        </AnimatePresence>
      </header>

      <style>{`
        .nav-link-active::after {
          content: '';
          position: absolute;
          bottom: 2px; left: 50%;
          width: 20px; height: 3px;
          border-radius: 3px;
          background: #E8751A;
          transform: translateX(-50%);
          animation: slideUnderline .25s ease both;
        }
        @keyframes slideUnderline {
          from { width: 0; opacity: 0; }
          to   { width: 20px; opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nav-link:hover { color: #E8751A !important; }
        .btn-login:hover { background: #C85E0A !important; transform: translateY(-1px); }
        @media (max-width: 900px) {
          .nav-desktop { display: none !important; }
          .btn-hamburger { display: flex !important; }
          .btn-login { display: none !important; }
          .brand-text > span:first-child { font-size: 13px !important; }
          .brand-text > span:last-child  { font-size: 9px  !important; letter-spacing: 1px !important; }
          .brand-divider { height: 28px !important; }
        }
        @media (max-width: 420px) {
          .brand-text > span:first-child { font-size: 11.5px !important; }
          .brand-text > span:last-child  { font-size: 8.5px  !important; }
        }
      `}</style>
    </>
  )
}
