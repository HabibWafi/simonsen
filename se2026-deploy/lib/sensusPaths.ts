/**
 * Sensus path helpers.
 * Sekarang konten SE2026 berada di sub-tree /se/2026/*.
 * Pakai helper ini agar internal link future-proof — kalau path berubah lagi
 * (mis. SE 2036 muncul, atau struktur direstruktur), cukup ubah di sini.
 */

export const SE2026_BASE = '/se/2026'
export const SP2030_BASE = '/sp/2030'
export const ST2033_BASE = '/st/2033'

/** Builder untuk path SE 2026. `se('/tahapan')` → `/se/2026/tahapan`. */
export function se(path: string = ''): string {
  if (!path) return SE2026_BASE
  return `${SE2026_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

/** Sensus root pages. */
export const SENSUS_ROOT = {
  sp: '/sp',
  st: '/st',
  se: '/se',
} as const
