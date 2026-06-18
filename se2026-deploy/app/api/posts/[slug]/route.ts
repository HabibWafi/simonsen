import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/** Public detail post by slug (hanya published). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const [rows] = await pool.execute(
      `SELECT id, judul, slug, kategori, excerpt, konten, thumbnail, media_type, video_url, author, created_at
       FROM posts WHERE slug = ? AND published = 1 LIMIT 1`,
      [slug],
    ) as [any[], any]
    if (!rows.length) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ data: rows[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'DB error' }, { status: 500 })
  }
}
