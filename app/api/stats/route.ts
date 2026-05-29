import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { hitungHariTersisa } from '@/lib/utils'
import { mockStats } from '@/lib/mockData'

export async function GET() {
  try {
    const [[summary]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_target,
        SUM(CASE WHEN status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS total_realisasi,
        COUNT(DISTINCT kdkec) AS kecamatan_count,
        COUNT(DISTINCT kddesa) AS desa_count
      FROM usaha
    `) as [any[], any]

    if (!summary || Number(summary.total_target) === 0) {
      return NextResponse.json({ ...mockStats, hari_tersisa: hitungHariTersisa() })
    }

    const [[activeToday]] = await pool.execute(`
      SELECT COUNT(DISTINCT petugas_id) AS petugas_aktif
      FROM usaha
      WHERE petugas_id IS NOT NULL AND status_pencacahan != 'belum'
    `) as [any[], any]

    const total_target    = Number(summary.total_target)    ?? 0
    const total_realisasi = Number(summary.total_realisasi) ?? 0

    return NextResponse.json({
      total_target,
      total_realisasi,
      persentase:      total_target > 0 ? Math.round((total_realisasi / total_target) * 1000) / 10 : 0,
      kecamatan_count: Number(summary.kecamatan_count) ?? 0,
      desa_count:      Number(summary.desa_count) ?? 0,
      petugas_aktif:   Number(activeToday?.petugas_aktif) ?? 0,
      hari_tersisa:    hitungHariTersisa(),
    })
  } catch {
    return NextResponse.json({ ...mockStats, hari_tersisa: hitungHariTersisa() })
  }
}
