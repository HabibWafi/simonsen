import NavbarRoot from '@/components/layout/NavbarRoot'
import FooterRoot from '@/components/layout/FooterRoot'

/**
 * Layout untuk halaman publik root + hub multi-sensus.
 * URL: /, /sp, /st, /se
 * Nuansa BPS netral (biru-hijau-oren).
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavbarRoot />
      <main style={{ flex: 1 }}>{children}</main>
      <FooterRoot />
    </>
  )
}
