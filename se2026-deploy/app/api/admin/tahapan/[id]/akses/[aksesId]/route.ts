import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { aksesSchema } from '@/lib/validators/tahapan'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; aksesId: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { aksesId } = await params
  const body = await req.json().catch(() => null)
  const parsed = aksesSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid', issues: parsed.error.flatten() }, { status: 400 })
  }
  const fields: string[] = []
  const values: any[] = []
  for (const [k, v] of Object.entries(parsed.data)) {
    fields.push(`${k} = ?`); values.push(v)
  }
  if (!fields.length) return NextResponse.json({ error: 'Empty' }, { status: 400 })
  values.push(Number(aksesId))
  await pool.execute(`UPDATE tahapan_akses SET ${fields.join(', ')} WHERE id = ?`, values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; aksesId: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { aksesId } = await params
  await pool.execute('DELETE FROM tahapan_akses WHERE id = ?', [Number(aksesId)])
  return NextResponse.json({ ok: true })
}
