import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

/** Admin: list semua anggota tim. */
export async function GET() {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  try {
    const [rows] = await pool.execute(
      `SELECT id, nama, peran, foto, tipe, kdkec, nmkec, urutan FROM tim_se ORDER BY tipe, urutan, nama`,
    ) as [any[], any]
    return NextResponse.json({ data: rows })
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e?.message }, { status: 500 })
  }
}

/** Admin: tambah anggota tim. */
export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  try {
    const b = await req.json()
    const nama = String(b.nama ?? '').trim()
    const peran = String(b.peran ?? '').trim()
    const tipe = ['struktural', 'pj_kecamatan'].includes(b.tipe) ? b.tipe : 'struktural'
    if (!nama || !peran) return NextResponse.json({ error: 'Nama dan peran wajib diisi' }, { status: 400 })
    await pool.execute(
      `INSERT INTO tim_se (nama, peran, foto, tipe, kdkec, nmkec, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nama, peran, b.foto ?? null, tipe, b.kdkec ?? null, b.nmkec ?? null, Number(b.urutan) || 0],
    )
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
