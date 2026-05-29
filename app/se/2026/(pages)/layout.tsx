import { getSensusConfig } from '@/lib/sensusConfig'
import NavbarSensus from '@/components/layout/NavbarSensus'
import FooterSensus from '@/components/layout/FooterSensus'

/**
 * Layout SE 2026.
 * Fetch config dari sensus_config WHERE sensus_kode='se' AND tahun=2026.
 * Konsumsi config: warna oren (#E8751A), wordmark BPS, nav links SE2026.
 *
 * Tidak menyentuh sub-tree /se/2026/dashboard — itu pakai layout sendiri.
 */
export default async function SE2026Layout({ children }: { children: React.ReactNode }) {
  const config = await getSensusConfig('se', 2026)
  return (
    <>
      <NavbarSensus config={config} />
      <main style={{ flex: 1 }}>{children}</main>
      <FooterSensus config={config} />
    </>
  )
}
