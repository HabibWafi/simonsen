import { z } from 'zod'

export const tahapanSchema = z.object({
  judul: z.string().min(2).max(200),
  periode: z.string().min(2).max(100),
  start_date: z.iso.date().nullable().optional(),
  end_date: z.iso.date().nullable().optional(),
  status: z.enum(['selesai', 'aktif', 'akan-datang']),
  deskripsi: z.string().max(2000).default(''),
  icon: z.string().max(10).default('📌'),
  urutan: z.number().int().nonnegative().default(0),
})

export type TahapanInput = z.infer<typeof tahapanSchema>
