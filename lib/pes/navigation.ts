import type { SensusConfig } from '@/types'

/** Overlay stored/custom navigation without rewriting the operator's JSON config. */
export function withPesNavigation(config: SensusConfig): SensusConfig {
  if (config.sensus_kode !== 'se' || config.tahun !== 2026) return config
  const pes = { label: 'PES', href: '/se/2026/pes' }
  const insert = (items: { label: string; href: string }[]) => {
    const clean = items.filter(item => item.href.replace(/\/$/, '') !== pes.href)
    const progress = clean.findIndex(item => item.href.replace(/\/$/, '') === '/se/2026/progress')
    const index = progress < 0 ? clean.length : progress + 1
    return [...clean.slice(0, index), pes, ...clean.slice(index)]
  }
  const columns = config.footer_config.kolomLinks
  const columnIndex = Math.max(0, columns.findIndex(column => column.items.some(item => item.href === '/se/2026/progress')))
  return { ...config, navbar_config: { ...config.navbar_config, navLinks: insert(config.navbar_config.navLinks) }, footer_config: { ...config.footer_config, kolomLinks: columns.length ? columns.map((column, index) => ({ ...column, items: index === columnIndex ? insert(column.items) : column.items.filter(item => item.href.replace(/\/$/, '') !== pes.href) })) : [{ judul: 'Sensus Ekonomi 2026', items: [pes] }] } }
}
