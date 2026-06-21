import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { hitungHariTersisa } from '@/lib/utils'

// Stats kosong (BUKAN dummy) — supaya tidak ada angka palsu yang menyesatkan.
const EMPTY_STATS = {
  total_target: 0, total_realisasi: 0, total_approve: 0, persentase: 0,
  kecamatan_count: 0, desa_count: 0, petugas_aktif: 0,
  last_ingest_unix: null, last_ingest_str: null, snapshot_ts: null, has_data: false,
}
const noStore = { headers: { 'Cache-Control': 'no-store' } }

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
      // Waktu data terakhir di-ingest dari bot (bukan waktu fetch client).
      // Pakai epoch absolut (UNIX_TIMESTAMP), lalu format ke WIB di Node →
      // benar walau timezone server/DB beda (mis. Hostinger UTC).
      const [[snap]] = await pool.execute(
        `SELECT UNIX_TIMESTAMP(MAX(created_at)) AS last_unix,
                (SELECT snapshot_ts FROM fasih_snapshot ORDER BY id DESC LIMIT 1) AS snapshot_ts
         FROM fasih_snapshot`,
      ) as [any[], any]
      const lastUnix = snap?.last_unix ? Number(snap.last_unix) : null
      const lastStr = lastUnix
        ? new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
          }).format(new Date(lastUnix * 1000)) + ' WIB'
        : null
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
        last_ingest_unix: lastUnix,
        last_ingest_str:  lastStr,
        snapshot_ts:      snap?.snapshot_ts ?? null,
        has_data: true,
        source: 'fasih',
      }, noStore)
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
      return NextResponse.json({ ...EMPTY_STATS, hari_tersisa: hitungHariTersisa() }, noStore)
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
      has_data:        true,
      source:          'usaha',
    }, noStore)
  } catch {
    return NextResponse.json({ ...EMPTY_STATS, hari_tersisa: hitungHariTersisa() }, noStore)
  }
}
