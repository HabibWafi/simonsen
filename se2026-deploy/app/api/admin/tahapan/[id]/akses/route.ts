import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { aksesSchema } from '@/lib/validators/tahapan'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  const [rows] = await pool.execute(
    `SELECT id, tahapan_id, nama, url, tipe, urutan FROM tahapan_akses
     WHERE tahapan_id = ? ORDER BY urutan ASC, id ASC`,
    [Number(id)],
  ) as [any[], any]
  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = aksesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }
  const a = parsed.data
  const [result] = await pool.execute(
    `INSERT INTO tahapan_akses (tahapan_id, nama, url, tipe, urutan) VALUES (?, ?, ?, ?, ?)`,
    [Number(id), a.nama, a.url, a.tipe, a.urutan],
  ) as [any, any]
  return NextResponse.json({ id: result.insertId, ...a }, { status: 201 })
}
