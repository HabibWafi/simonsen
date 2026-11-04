import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { defaultTahapan, resolveTahapan } from '@/lib/tahapan'
import type { Tahapan } from '@/types'

/**
 * Public schedule; status is evaluated for the current date in Jakarta.
 * Fallback ke mockData kalau tabel kosong / DB error supaya halaman publik tidak rusak.
 */
export async function GET() {
  try {
    const [tahapanRows] = await pool.execute(
      `SELECT id, judul, periode, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, status, deskripsi, icon, urutan
       FROM tahapan ORDER BY urutan ASC, id ASC`,
    ) as [Tahapan[], unknown]

    if (!tahapanRows.length) {
      // DB empty → fallback to mockData
      return scheduleResponse(defaultTahapan)
    }

    return scheduleResponse(tahapanRows)
  } catch {
    return scheduleResponse(defaultTahapan)
  }
}

function scheduleResponse(items: Tahapan[]) {
  const now = Date.now()
  return NextResponse.json({ data: items.map(item => resolveTahapan(item, now)) }, { headers: { 'Cache-Control': 'no-store' } })
}
