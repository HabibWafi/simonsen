/**
 * Sensus config server-side loader.
 * Fetch dari DB tabel sensus_config dengan in-memory cache (per-process).
 * Layout per-sensus pakai ini untuk render NavbarSensus/FooterSensus.
 */
import pool from './db'
import type { SensusConfig, NavbarConfig, FooterConfig } from '@/types'

// ---------- Default fallback (kalau DB belum di-migrate) ----------
const SE2026_FALLBACK: SensusConfig = {
  id: 0,
  sensus_kode: 'se',
  tahun: 2026,
  nama_lengkap: 'Sensus Ekonomi 2026',
  nama_pendek: 'SE 2026',
  primary_color: '#E8751A',
  secondary_color: '#C85E0A',
  navbar_config: {
    wordmarkAtas: 'Badan Pusat Statistik',
    wordmarkBawah: 'Kabupaten Musi Rawas',
    navLinks: [
      { label: 'Beranda', href: '/se/2026' },
      { label: 'Tahapan', href: '/se/2026/tahapan' },
      { label: 'Progress', href: '/se/2026/progress' },
      { label: 'Sosialisasi', href: '/se/2026/sosialisasi' },
      { label: 'FAQ', href: '/se/2026/faq' },
      { label: 'Tentang', href: '/se/2026/tentang' },
    ],
    ctaLabel: 'Login Petugas',
    ctaHref: '/se/2026/login',
  },
  footer_config: {
    tagline: 'Portal resmi Sensus Ekonomi 2026 Kabupaten Musi Rawas.',
    kolomLinks: [
      {
        judul: 'Sensus Ekonomi 2026',
        items: [
          { label: 'Tahapan', href: '/se/2026/tahapan' },
          { label: 'Progress', href: '/se/2026/progress' },
          { label: 'Sosialisasi', href: '/se/2026/sosialisasi' },
          { label: 'FAQ', href: '/se/2026/faq' },
          { label: 'Publikasi', href: '/se/2026/publikasi' },
          { label: 'Tentang', href: '/se/2026/tentang' },
        ],
      },
      {
        judul: 'Portal Sensus',
        items: [
          { label: 'Sensus Penduduk', href: '/sp' },
          { label: 'Sensus Pertanian', href: '/st' },
          { label: 'Sensus Ekonomi', href: '/se' },
        ],
      },
    ],
    kontak: {
      alamat: 'Komplek Perkantoran Pemkab Musi Rawas Agropolitan Center, Muara Beliti, Kabupaten Musi Rawas, Sumatera Selatan',
      telp: '(0733) 7432008',
      faks: '(0733) 7432008',
      email: 'bps1605@bps.go.id',
      whatsapp: 'http://s.bps.go.id/AdminBPS1605',
    },
    sosmed: [
      { platform: 'facebook',  url: 'https://www.facebook.com/bps.rawas' },
      { platform: 'instagram', url: 'https://www.instagram.com/bpskabmusirawas/' },
      { platform: 'youtube',   url: 'https://www.youtube.com/@bpsmusirawas50' },
      { platform: 'whatsapp',  url: 'http://s.bps.go.id/AdminBPS1605' },
    ],
    copyright: '© 2026 BPS Kabupaten Musi Rawas — Sensus Ekonomi 2026',
  },
  is_active: true,
}

// In-process cache (60 detik). Server restart → cache hilang.
const cache = new Map<string, { data: SensusConfig; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 1000

function cacheKey(kode: string, tahun: number) {
  return `${kode}_${tahun}`
}

/**
 * Ambil config sensus by (kode, tahun). Server-side only.
 * Kalau DB belum siap atau config tidak ada → fallback hardcoded (untuk SE 2026).
 */
export async function getSensusConfig(kode: string, tahun: number): Promise<SensusConfig> {
  const key = cacheKey(kode, tahun)
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) return cached.data

  try {
    const [rows] = await pool.execute(
      `SELECT id, sensus_kode, tahun, nama_lengkap, nama_pendek,
              primary_color, secondary_color, navbar_config, footer_config, is_active
       FROM sensus_config
       WHERE sensus_kode = ? AND tahun = ? LIMIT 1`,
      [kode, tahun],
    ) as [any[], any]
    if (rows.length > 0) {
      const r = rows[0]
      const data: SensusConfig = {
        id: Number(r.id),
        sensus_kode: r.sensus_kode,
        tahun: Number(r.tahun),
        nama_lengkap: r.nama_lengkap,
        nama_pendek: r.nama_pendek,
        primary_color: r.primary_color,
        secondary_color: r.secondary_color,
        navbar_config: typeof r.navbar_config === 'string' ? JSON.parse(r.navbar_config) as NavbarConfig : r.navbar_config,
        footer_config: typeof r.footer_config === 'string' ? JSON.parse(r.footer_config) as FooterConfig : r.footer_config,
        is_active: !!r.is_active,
      }
      cache.set(key, { data, expiresAt: now + CACHE_TTL_MS })
      return data
    }
  } catch (e: any) {
    console.warn(`[sensusConfig] DB fetch gagal untuk ${kode}/${tahun}:`, e?.message)
  }

  // Fallback
  if (kode === 'se' && tahun === 2026) return SE2026_FALLBACK
  throw new Error(`Sensus config tidak ditemukan: ${kode}/${tahun}`)
}

/** Clear cache (call setelah update config dari admin). */
export function clearSensusConfigCache(kode?: string, tahun?: number) {
  if (kode && tahun) cache.delete(cacheKey(kode, tahun))
  else cache.clear()
}
