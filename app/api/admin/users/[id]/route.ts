import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { userUpdateSchema } from '@/lib/validators/user'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid', issues: parsed.error.flatten() }, { status: 400 })
  }
  const fields: string[] = []
  const values: any[] = []
  for (const [k, v] of Object.entries(parsed.data)) {
    if (k === 'password' && v) {
      fields.push('password = ?')
      values.push(await bcrypt.hash(v as string, 10))
    } else if (k !== 'password') {
      fields.push(`${k} = ?`)
      values.push(v ?? null)
    }
  }
  if (!fields.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  values.push(idNum)
  await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  const idNum = Number(id)
  // safety: don't allow deleting yourself
  if (String(guard.id) === String(idNum)) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  }
  await pool.execute('DELETE FROM users WHERE id = ?', [idNum])
  return NextResponse.json({ ok: true })
}
