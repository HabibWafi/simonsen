import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { tahapanSchema } from '@/lib/validators/tahapan'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard

  const { id } = await params
  const idNum = Number(id)
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const parsed = tahapanSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
  }
  const t = parsed.data

  const fields: string[] = []
  const values: any[] = []
  for (const [k, v] of Object.entries(t)) {
    fields.push(`${k} = ?`)
    values.push(v ?? null)
  }
  if (!fields.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  values.push(idNum)
  await pool.execute(`UPDATE tahapan SET ${fields.join(', ')} WHERE id = ?`, values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  await pool.execute('DELETE FROM tahapan WHERE id = ?', [Number(id)])
  return NextResponse.json({ ok: true })
}
