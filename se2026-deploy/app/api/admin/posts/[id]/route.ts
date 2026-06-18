import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

const KATEGORI = ['berita', 'sosialisasi', 'infografis', 'video', 'pengumuman']

/** Admin: update post (PUT). Body partial diperbolehkan. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  try {
    const b = await req.json()
    const fields: string[] = []
    const vals: any[] = []
    const set = (col: string, v: any) => { fields.push(`${col} = ?`); vals.push(v) }

    if (b.judul !== undefined) set('judul', String(b.judul))
    if (b.kategori !== undefined) {
      if (!KATEGORI.includes(b.kategori)) return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 })
      set('kategori', b.kategori)
    }
    if (b.excerpt !== undefined) set('excerpt', b.excerpt ?? null)
    if (b.konten !== undefined) set('konten', b.konten ?? null)
    if (b.thumbnail !== undefined) set('thumbnail', b.thumbnail ?? null)
    if (b.media_type !== undefined) set('media_type', ['none', 'image', 'video'].includes(b.media_type) ? b.media_type : 'none')
    if (b.video_url !== undefined) set('video_url', b.video_url ?? null)
    if (b.author !== undefined) set('author', b.author || 'BPS Kab. Musi Rawas')
    if (b.published !== undefined) set('published', b.published ? 1 : 0)

    if (!fields.length) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
    vals.push(id)
    await pool.execute(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, vals)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

/** Admin: hapus post. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  try {
    await pool.execute('DELETE FROM posts WHERE id = ?', [id])
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
