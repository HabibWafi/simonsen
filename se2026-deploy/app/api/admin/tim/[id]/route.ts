import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  try {
    const b = await req.json()
    const fields: string[] = []
    const vals: any[] = []
    const set = (c: string, v: any) => { fields.push(`${c} = ?`); vals.push(v) }
    if (b.nama !== undefined) set('nama', String(b.nama))
    if (b.peran !== undefined) set('peran', String(b.peran))
    if (b.foto !== undefined) set('foto', b.foto ?? null)
    if (b.tipe !== undefined) set('tipe', ['struktural', 'pj_kecamatan'].includes(b.tipe) ? b.tipe : 'struktural')
    if (b.kdkec !== undefined) set('kdkec', b.kdkec ?? null)
    if (b.nmkec !== undefined) set('nmkec', b.nmkec ?? null)
    if (b.urutan !== undefined) set('urutan', Number(b.urutan) || 0)
    if (!fields.length) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
    vals.push(id)
    await pool.execute(`UPDATE tim_se SET ${fields.join(', ')} WHERE id = ?`, vals)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  try {
    await pool.execute('DELETE FROM tim_se WHERE id = ?', [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
