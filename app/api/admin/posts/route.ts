import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { slugify } from '@/lib/utils'

const KATEGORI = ['berita', 'sosialisasi', 'infografis', 'video', 'pengumuman']

/** Admin: list semua post (termasuk draft). */
export async function GET() {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard
  try {
    const [rows] = await pool.execute(
      `SELECT id, judul, slug, kategori, excerpt, thumbnail, media_type, video_url, author, published, created_at, updated_at
       FROM posts ORDER BY created_at DESC`,
    ) as [any[], any]
    return NextResponse.json({ data: rows })
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e?.message }, { status: 500 })
  }
}

/** Admin: buat post baru. */
export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard
  try {
    const b = await req.json()
    const judul = String(b.judul ?? '').trim()
    const kategori = String(b.kategori ?? '')
    if (!judul) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
    if (!KATEGORI.includes(kategori)) return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 })

    // slug unik
    let slug = slugify(judul)
    const [dup] = await pool.execute('SELECT COUNT(*) c FROM posts WHERE slug LIKE ?', [`${slug}%`]) as [any[], any]
    if (Number(dup[0].c) > 0) slug = `${slug}-${Date.now().toString().slice(-5)}`

    const mediaType = b.media_type && ['none', 'image', 'video'].includes(b.media_type) ? b.media_type : 'none'
    await pool.execute(
      `INSERT INTO posts (judul, slug, kategori, excerpt, konten, thumbnail, media_type, video_url, author, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        judul, slug, kategori,
        b.excerpt ?? null, b.konten ?? null, b.thumbnail ?? null,
        mediaType, b.video_url ?? null,
        b.author || 'BPS Kab. Musi Rawas',
        b.published ? 1 : 0,
      ],
    )
    return NextResponse.json({ success: true, slug }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
