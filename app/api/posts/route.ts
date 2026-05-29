import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { mockPosts } from '@/lib/mockData'

/** Public list sosialisasi/berita (hanya published). */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const kategori = searchParams.get('kategori') ?? 'semua'
  const page     = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit    = Math.min(24, Math.max(1, Number(searchParams.get('limit') ?? 9)))
  const offset   = (page - 1) * limit

  try {
    const whereClause = kategori !== 'semua' ? 'WHERE published = 1 AND kategori = ?' : 'WHERE published = 1'
    const params      = kategori !== 'semua' ? [kategori, limit, offset] : [limit, offset]

    const [rows] = await pool.execute(
      `SELECT id, judul, slug, kategori, excerpt, thumbnail, media_type, video_url, author, created_at FROM posts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    ) as [any[], any]

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM posts ${whereClause}`,
      kategori !== 'semua' ? [kategori] : []
    ) as [any[], any]

    return NextResponse.json({ data: rows, total: Number(total), page, limit })
  } catch {
    const filtered = kategori !== 'semua' ? mockPosts.filter(p => p.kategori === kategori) : mockPosts
    const slice = filtered.slice(offset, offset + limit)
    return NextResponse.json({ data: slice, total: filtered.length, page, limit })
  }
}
