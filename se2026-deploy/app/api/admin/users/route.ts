import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { userCreateSchema } from '@/lib/validators/user'

export async function GET() {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const [rows] = await pool.execute(
    `SELECT id, nip, nama, role, kecamatan, kdkec, created_at FROM users ORDER BY id ASC`,
  ) as [any[], any]
  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard

  const body = await req.json().catch(() => null)
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }
  const u = parsed.data
  const hashed = await bcrypt.hash(u.password, 10)

  try {
    const [result] = await pool.execute(
      `INSERT INTO users (nip, nama, role, kdkec, password) VALUES (?, ?, ?, ?, ?)`,
      [u.nip, u.nama, u.role, u.kdkec ?? null, hashed],
    ) as [any, any]
    return NextResponse.json({ id: result.insertId, nip: u.nip, nama: u.nama, role: u.role }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'NIP sudah terdaftar' }, { status: 409 })
    }
    return NextResponse.json({ error: e.message ?? 'DB error' }, { status: 500 })
  }
}
