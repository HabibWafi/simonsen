import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { jadwalTimeline } from '@/lib/mockData'

/**
 * Public endpoint. Returns tahapan list + nested akses lanjutan.
 * Fallback ke mockData kalau tabel kosong / DB error supaya halaman publik tidak rusak.
 */
export async function GET() {
  try {
    const [tahapanRows] = await pool.execute(
      `SELECT id, judul, periode, start_date, end_date, status, deskripsi, icon, urutan
       FROM tahapan ORDER BY urutan ASC, id ASC`,
    ) as [any[], any]

    if (!tahapanRows.length) {
      // DB empty → fallback to mockData
      return NextResponse.json({ data: jadwalTimeline.map(t => ({ ...t, urutan: t.id, akses: [] })) })
    }

    const ids = tahapanRows.map(r => r.id)
    let aksesRows: any[] = []
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',')
      const [rows] = await pool.execute(
        `SELECT id, tahapan_id, nama, url, tipe, urutan
         FROM tahapan_akses WHERE tahapan_id IN (${placeholders})
         ORDER BY urutan ASC, id ASC`,
        ids,
      ) as [any[], any]
      aksesRows = rows
    }

    const data = tahapanRows.map(t => ({
      ...t,
      akses: aksesRows.filter(a => a.tahapan_id === t.id),
    }))
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ data: jadwalTimeline.map(t => ({ ...t, urutan: t.id, akses: [] })) })
  }
}
