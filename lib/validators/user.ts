import { z } from 'zod'

export const userCreateSchema = z.object({
  nip: z.string().min(3).max(30),
  nama: z.string().min(2).max(150),
  role: z.enum(['petugas', 'koordinator', 'admin']),
  kdkec: z.string().max(10).nullable().optional(),
  password: z.string().min(6).max(100),
})

export const userUpdateSchema = z.object({
  nama: z.string().min(2).max(150).optional(),
  role: z.enum(['petugas', 'koordinator', 'admin']).optional(),
  kdkec: z.string().max(10).nullable().optional(),
  password: z.string().min(6).max(100).optional(),
})
