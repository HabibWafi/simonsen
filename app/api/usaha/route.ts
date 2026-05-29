import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const guard = await requireRole('auth')
  if (guard instanceof NextResponse) return guard

  const url = new URL(req.url)
  const kdkec = url.searchParams.get('kec') ?? ''
  const kddesa = url.searchParams.get('desa') ?? ''
  const skala = url.searchParams.get('skala') ?? ''
  const status = url.searchParams.get('status') ?? ''
  const q = (url.searchParams.get('q') ?? '').trim()
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const perPage = Math.min(200, Math.max(10, Number(url.searchParams.get('per') ?? '50')))
  const offset = (page - 1) * perPage

  const where: string[] = []
  const params: any[] = []

  // Role-based scope: petugas hanya lihat kdkec-nya
  if (guard.role === 'petugas' && guard.kdkec) {
    where.push('kdkec = ?')
    params.push(guard.kdkec)
  } else if (kdkec) {
    where.push('kdkec = ?'); params.push(kdkec)
  }
  if (kddesa)  { where.push('kddesa = ?'); params.push(kddesa) }
  if (skala && ['UMK','UM','UB'].includes(skala)) {
    where.push('skala_usaha = ?'); params.push(skala)
  }
  if (status && ['belum','proses','selesai','tolak','tutup','ganda'].includes(status)) {
    where.push('status_pencacahan = ?'); params.push(status)
  }
  if (q) {
    where.push('(idsbr LIKE ? OR nama LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  try {
    const [[count]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM usaha ${whereClause}`,
      params,
    ) as [any[], any]

    const [rows] = await pool.query(
      `SELECT idsbr, nama, alamat, kdkec, nmkec, kddesa, nmdesa, skala_usaha,
              status_pencacahan, tanggal_cacah, lat, lng, petugas_id
       FROM usaha
       ${whereClause}
       ORDER BY nmkec, nmdesa, nama
       LIMIT ${perPage} OFFSET ${offset}`,
      params,
    ) as [any[], any]

    // Normalize lat/lng: mysql2 mengembalikan DECIMAL sebagai string → cast ke number untuk UI.
    const data = rows.map((r: any) => ({
      ...r,
      lat: r.lat != null ? Number(r.lat) : null,
      lng: r.lng != null ? Number(r.lng) : null,
    }))

    return NextResponse.json({
      data,
      total: Number(count.total),
      page,
      perPage,
      pageCount: Math.ceil(Number(count.total) / perPage),
    })
  } catch (e: any) {
    return NextResponse.json({ data: [], total: 0, page, perPage, pageCount: 0, error: e.message })
  }
}
