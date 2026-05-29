import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/progress?skala=UMK|UM|UB
 * Aggregate dari tabel `usaha` per-kecamatan.
 *
 * - skala kosong → totals + breakdown 3-skala (UMK/UM/UB)
 * - skala spesifik → totals hanya skala terpilih, breakdown NULL
 *
 * Sumber data: tabel `usaha` (master + progress). Tidak ada fallback ke mock —
 * kalau DB error / kosong, kirim empty array supaya UI tahu.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const skala = url.searchParams.get('skala')
  const skalaFilter = skala && ['UMK', 'UM', 'UB'].includes(skala) ? skala : null

  try {
    const [rows] = await pool.execute(
      `SELECT
         kdkec,
         MAX(nmkec) AS kecamatan,
         MAX(nmkec) AS nmkec,
         COUNT(*) AS target_usaha,
         SUM(CASE WHEN status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS realisasi,
         COUNT(DISTINCT petugas_id) AS petugas_count,
         SUM(CASE WHEN skala_usaha = 'UMK' THEN 1 ELSE 0 END) AS umk_target,
         SUM(CASE WHEN skala_usaha = 'UM'  THEN 1 ELSE 0 END) AS um_target,
         SUM(CASE WHEN skala_usaha = 'UB'  THEN 1 ELSE 0 END) AS ub_target,
         SUM(CASE WHEN skala_usaha = 'UMK' AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS umk_done,
         SUM(CASE WHEN skala_usaha = 'UM'  AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS um_done,
         SUM(CASE WHEN skala_usaha = 'UB'  AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS ub_done,
         CASE
           WHEN SUM(CASE WHEN status_pencacahan = 'selesai' THEN 1 ELSE 0 END) = COUNT(*) THEN 'selesai'
           WHEN SUM(CASE WHEN status_pencacahan != 'belum' THEN 1 ELSE 0 END) > 0 THEN 'berlangsung'
           ELSE 'belum'
         END AS status
       FROM usaha
       ${skalaFilter ? 'WHERE skala_usaha = ?' : ''}
       GROUP BY kdkec
       ORDER BY realisasi DESC`,
      skalaFilter ? [skalaFilter] : [],
    ) as [any[], any]

    const pct = (real: number, t: number) => t > 0 ? Math.round((real / t) * 1000) / 10 : 0

    const data = rows.map((r, i) => {
      const target = Number(r.target_usaha)
      const real = Number(r.realisasi)
      const umkT = Number(r.umk_target), umkD = Number(r.umk_done)
      const umT  = Number(r.um_target),  umD  = Number(r.um_done)
      const ubT  = Number(r.ub_target),  ubD  = Number(r.ub_done)
      return {
        id: i + 1,
        kdkec: r.kdkec,
        nmkec: r.nmkec,
        kecamatan: r.kecamatan,
        target_usaha: target,
        realisasi: real,
        petugas_count: Number(r.petugas_count),
        status: r.status,
        persentase: pct(real, target),
        breakdown: skalaFilter ? null : {
          UMK: { target: umkT, realisasi: umkD, persentase: pct(umkD, umkT) },
          UM:  { target: umT,  realisasi: umD,  persentase: pct(umD,  umT) },
          UB:  { target: ubT,  realisasi: ubD,  persentase: pct(ubD,  ubT) },
        },
      }
    })
    return NextResponse.json({ data })
  } catch (e: any) {
    console.error('[api/progress] error:', e?.message)
    return NextResponse.json({ data: [], error: e?.message ?? 'DB error' })
  }
}
