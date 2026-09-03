'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import type { Role, SessionUser } from '@/types'
import FooterDashboard from '@/components/layout/FooterDashboard'
import { ToastProvider } from '@/components/Toast'

// SE 2026 sensus context — sentral di file ini.
const SENSUS = { kode: 'se', tahun: 2026, label: 'SE 2026', primary: '#E8751A', accent: '#FFF0DC', accentText: '#C85E0A' }
const BASE = `/${SENSUS.kode}/${SENSUS.tahun}/dashboard`
const LOGIN_HREF = `/${SENSUS.kode}/${SENSUS.tahun}/login`

interface MenuItem {
  href: string
  label: string
  icon: string
  roles: Role[]
}

const menuItems: MenuItem[] = [
  { href: BASE,                  label: 'Dashboard',        icon: '📊', roles: ['admin', 'koordinator', 'petugas'] },
  { href: `${BASE}/progress`,    label: 'Peta Wilayah',     icon: '🗺️', roles: ['admin', 'koordinator', 'petugas'] },
  { href: `${BASE}/usaha`,       label: 'Daftar Usaha',     icon: '🏪', roles: ['admin', 'koordinator', 'petugas'] },
  { href: `${BASE}/petugas`,     label: 'Progress Petugas', icon: '🧑‍🌾', roles: ['admin', 'koordinator'] },
  { href: `${BASE}/tagging`,     label: 'Data Tagging',     icon: '◎', roles: ['admin'] },
  { href: `${BASE}/import`,      label: 'Import Data',      icon: '⬆️', roles: ['admin', 'koordinator'] },
  { href: `${BASE}/tahapan`,     label: 'Kelola Tahapan',   icon: '📅', roles: ['admin'] },
  { href: `${BASE}/sosialisasi`, label: 'Kelola Sosialisasi', icon: '📰', roles: ['admin', 'koordinator'] },
  { href: `${BASE}/tim`,         label: 'Kelola Tim',       icon: '🧑‍💼', roles: ['admin'] },
  { href: `${BASE}/pengguna`,    label: 'Kelola Pengguna',  icon: '👥', roles: ['admin'] },
  { href: `${BASE}/api`,         label: 'API & Token',      icon: '🔑', roles: ['admin'] },
  { href: `${BASE}/laporan`,     label: 'Input Laporan',    icon: '📝', roles: ['petugas', 'koordinator'] },
]

const roleLabel: Record<Role, string> = {
  admin: 'Admin',
  koordinator: 'Koordinator',
  petugas: 'Petugas Lapangan',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as SessionUser | undefined
  const role: Role = (user?.role ?? 'petugas') as Role

  const visibleItems = menuItems.filter(m => m.roles.includes(role))
  const activeItem = visibleItems.find(m =>
    m.href === BASE ? pathname === BASE : pathname.startsWith(m.href) && m.href !== BASE,
  ) ?? visibleItems.find(m => m.href === BASE)

  return (
    <ToastProvider>
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#FAF8F5' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        <aside className="admin-sidebar" style={{
          width: sidebarOpen ? 240 : 60, flexShrink: 0,
          background: 'white', borderRight: '1px solid #EDE3D8',
          transition: 'width .25s ease', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 14px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {sidebarOpen && (
              <div className="admin-sidebar-brand">
                <div style={{ fontSize: 12, fontWeight: 700, color: SENSUS.primary, textTransform: 'uppercase', letterSpacing: .5 }}>{SENSUS.label}</div>
                <div style={{ fontSize: 11, color: '#6B6B6B' }}>Panel Admin</div>
              </div>
            )}
            <button className="admin-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6, color: '#6B6B6B', flexShrink: 0 }}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
            {visibleItems.map(item => {
              const isActive = item.href === BASE ? pathname === BASE : pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 10px', borderRadius: 8, textDecoration: 'none',
                  background: isActive ? SENSUS.accent : 'transparent',
                  color: isActive ? SENSUS.primary : '#3D3D3D',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13, transition: 'all .15s', whiteSpace: 'nowrap',
                }} className="sidebar-link">
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && <span className="admin-sidebar-label">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {sidebarOpen && user && (
            <div className="admin-sidebar-user" style={{ padding: '14px', borderTop: '1px solid #EDE3D8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: SENSUS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {(user.name ?? '?').toString().charAt(0).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B' }}>{roleLabel[role]}</div>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: LOGIN_HREF })}
                style={{ width: '100%', padding: '8px', borderRadius: 6, background: '#FFF1F2', color: '#E8192C', border: '1px solid #FECDD3', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >🚪 Logout</button>
            </div>
          )}
        </aside>

        <div className="admin-main" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <header className="admin-header" style={{ background: 'white', borderBottom: '1px solid #EDE3D8', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
              {activeItem?.label ?? 'Dashboard'}
            </h2>
            <div className="admin-header-meta" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href={`/${SENSUS.kode}/${SENSUS.tahun}`} style={{ fontSize: 12, color: SENSUS.primary, textDecoration: 'none', fontWeight: 600 }}>
                ↗ Buka Halaman Publik
              </Link>
              <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </header>

          <div className="admin-content" style={{ padding: 24, flex: 1 }}>
            {children}
          </div>

          <FooterDashboard sensusLabel={SENSUS.label} primary={SENSUS.primary} />
        </div>
      </div>

      <style>{`
        .sidebar-link:hover { background: ${SENSUS.accent} !important; color: ${SENSUS.primary} !important; }
        .admin-main { min-width: 0; }
        @media (max-width: 720px) {
          .admin-sidebar { width: 56px !important; }
          .admin-sidebar-brand, .admin-sidebar-label, .admin-sidebar-user, .admin-sidebar-toggle { display: none !important; }
          .admin-sidebar nav { padding-inline: 7px !important; }
          .admin-sidebar .sidebar-link { justify-content: center; padding-inline: 8px !important; }
          .admin-header { padding-inline: 12px !important; }
          .admin-header-meta span { display: none; }
          .admin-content { padding: 12px !important; }
        }
      `}</style>
    </div>
    </ToastProvider>
  )
}
