import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthSessionProvider from '@/components/AuthSessionProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Portal Sensus BPS Kabupaten Musi Rawas',
  description: 'Portal multi-sensus BPS Kabupaten Musi Rawas — Sensus Penduduk, Pertanian, dan Ekonomi.',
  keywords: 'bps musi rawas, sensus, se2026, sp2030, st2033, sumatera selatan',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'Portal Sensus BPS Musi Rawas',
    description: 'Portal multi-sensus BPS Kabupaten Musi Rawas',
    locale: 'id_ID',
    type: 'website',
  },
}

/**
 * Root layout — sengaja minimalis. Tidak punya Navbar/Footer.
 * Tiap route group bertanggung jawab atas chrome-nya sendiri:
 *  - (public)/ → NavbarRoot + FooterRoot (multi-warna BPS)
 *  - se/2026/  → NavbarSensus + FooterSensus (oren SE)
 *  - se/2026/dashboard/ → sidebar admin + FooterDashboard (minimalis)
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} data-scroll-behavior="smooth">
      <body style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
}
