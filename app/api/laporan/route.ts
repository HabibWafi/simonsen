import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      user_id = 1,
      tanggal, kecamatan, desa, blok_sensus,
      usaha_didatangi = 0, usaha_dicacah = 0, usaha_kosong = 0, usaha_tolak = 0,
      kategori = [], kendala = null, catatan = null, foto_urls = [],
      lat = null, lng = null,
    } = body

    if (!tanggal || !kecamatan || !desa || !blok_sensus) {
      return NextResponse.json({ error: 'Field wajib: tanggal, kecamatan, desa, blok_sensus' }, { status: 400 })
    }

    await pool.execute(
      `INSERT INTO laporan_harian
        (user_id, tanggal, kecamatan, desa, blok_sensus,
         usaha_didatangi, usaha_dicacah, usaha_kosong, usaha_tolak,
         kategori, kendala, catatan, foto_urls, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, tanggal, kecamatan, desa, blok_sensus,
        usaha_didatangi, usaha_dicacah, usaha_kosong, usaha_tolak,
        JSON.stringify(kategori), kendala, catatan, JSON.stringify(foto_urls),
        lat, lng,
      ]
    )

    /* Update realisasi on progress_kecamatan */
    await pool.execute(
      `UPDATE progress_kecamatan
       SET realisasi = realisasi + ?,
           status = CASE WHEN status = 'belum' THEN 'berlangsung' ELSE status END
       WHERE kecamatan = ?`,
      [usaha_dicacah, kecamatan]
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const limit = Math.min(50, Number(req.nextUrl.searchParams.get('recent') ?? 10))
  try {
    const [rows] = await pool.execute(
      `SELECT l.id, l.tanggal, l.kecamatan, l.desa, l.usaha_dicacah, u.nama AS petugas
       FROM laporan_harian l
       JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT ?`,
      [limit]
    ) as [any[], any]
    return NextResponse.json({ data: rows })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
