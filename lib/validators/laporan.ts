import { z } from 'zod'

const count = z.number().int().min(0).max(1_000_000).default(0)
export const laporanSchema = z.object({
  tanggal: z.iso.date(),
  kecamatan: z.string().trim().min(1).max(150),
  desa: z.string().trim().min(1).max(150),
  blok_sensus: z.string().trim().min(1).max(50),
  usaha_didatangi: count,
  usaha_dicacah: count,
  usaha_kosong: count,
  usaha_tolak: count,
  kategori: z.array(z.string().max(100)).max(20).default([]),
  kendala: z.string().max(2000).nullable().default(null),
  catatan: z.string().max(5000).nullable().default(null),
  foto_urls: z.array(z.string().regex(/^\/uploads\/[a-zA-Z0-9/_-]+\.webp$/)).max(10).default([]),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
})
