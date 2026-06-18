import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { tahapanSchema } from '@/lib/validators/tahapan'

export async function GET() {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard

  const [rows] = await pool.execute(
    `SELECT id, judul, periode, start_date, end_date, status, deskripsi, icon, urutan, created_at, updated_at
     FROM tahapan ORDER BY urutan ASC, id ASC`,
  ) as [any[], any]
  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard

  const body = await req.json().catch(() => null)
  const parsed = tahapanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }
  const t = parsed.data
  const [result] = await pool.execute(
    `INSERT INTO tahapan (judul, periode, start_date, end_date, status, deskripsi, icon, urutan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [t.judul, t.periode, t.start_date ?? null, t.end_date ?? null, t.status, t.deskripsi, t.icon, t.urutan],
  ) as [any, any]

  return NextResponse.json({ id: result.insertId, ...t }, { status: 201 })
}
