import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { hitungHariTersisa } from '@/lib/utils'
import { mockStats } from '@/lib/mockData'

export async function GET() {
  try {
    // ---- Sumber utama: fasih_kec (realtime) ----
    const [[fk]] = await pool.execute(`
      SELECT SUM(total) AS total_target, SUM(selesai_cacah) AS total_realisasi,
             SUM(selesai_approve) AS total_approve, COUNT(*) AS kecamatan_count
      FROM fasih_kec
    `) as [any[], any]

    if (fk && Number(fk.total_target) > 0) {
      const [[pet]] = await pool.execute(
        `SELECT COUNT(DISTINCT pencacah) AS petugas_aktif FROM fasih_subsls WHERE selesai_cacah > 0`,
      ) as [any[], any]
      const [[ds]] = await pool.execute(`SELECT COUNT(*) AS desa_count FROM fasih_desa`) as [any[], any]
      const total_target = Number(fk.total_target), total_realisasi = Number(fk.total_realisasi)
      return NextResponse.json({
        total_target,
        total_realisasi,
        total_approve:   Number(fk.total_approve),
        persentase:      total_target > 0 ? Math.round((total_realisasi / total_target) * 1000) / 10 : 0,
        kecamatan_count: Number(fk.kecamatan_count),
        desa_count:      Number(ds?.desa_count) ?? 0,
        petugas_aktif:   Number(pet?.petugas_aktif) ?? 0,
        hari_tersisa:    hitungHariTersisa(),
        source: 'fasih',
      })
    }

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
