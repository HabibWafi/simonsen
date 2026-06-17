import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/progress
 * Agregat progress per-kecamatan.
 *
 * SUMBER UTAMA: tabel `fasih_kec` (hasil scraper Fasih — realtime status cacah).
 * FALLBACK: agregasi dari tabel `usaha` (kalau fasih_kec masih kosong).
 *
 * `realisasi` & `persentase` memakai metrik **selesai_cacah** (submitted pencacah).
 * Field tambahan `fasih` berisi rincian status (open/draft/submitted/approved) + approve.
 */
export async function GET(_req: NextRequest) {
  try {
    const [fasih] = await pool.execute(
      `SELECT kode_kec, total, open, draft, submitted_pencacah, submitted_responden,
              approved, rejected, revoked, selesai_cacah, selesai_approve, pct_cacah, pct_approve
       FROM fasih_kec ORDER BY selesai_cacah DESC`,
    ) as [any[], any]

    if (fasih.length > 0) {
      // Nama kecamatan + jumlah petugas dari sumber lain
      const [namaRows] = await pool.execute(`SELECT DISTINCT kdkec, nmkec FROM desa`) as [any[], any]
      const namaMap = new Map<string, string>()
      for (const r of namaRows) namaMap.set(String(r.kdkec), r.nmkec)

      const [petugasRows] = await pool.execute(
        `SELECT kode_kec, COUNT(DISTINCT pencacah) AS n FROM fasih_subsls WHERE pencacah IS NOT NULL GROUP BY kode_kec`,
      ) as [any[], any]
      const petugasMap = new Map<string, number>()
      for (const r of petugasRows) petugasMap.set(String(r.kode_kec), Number(r.n))

      const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0
      const data = fasih.map((r: any, i: number) => {
        const total = Number(r.total)
        const cacah = Number(r.selesai_cacah)
        const approve = Number(r.selesai_approve)
        const nmkec = namaMap.get(String(r.kode_kec)) ?? String(r.kode_kec)
        return {
          id: i + 1,
          kdkec: r.kode_kec,
          nmkec,
          kecamatan: nmkec,
          target_usaha: total,
          realisasi: cacah,
          persentase: pct(cacah, total),
          petugas_count: petugasMap.get(String(r.kode_kec)) ?? 0,
          status: cacah >= total && total > 0 ? 'selesai' : cacah > 0 ? 'berlangsung' : 'belum',
          breakdown: null,
          fasih: {
            open: Number(r.open), draft: Number(r.draft),
            submitted: Number(r.submitted_pencacah), submitted_responden: Number(r.submitted_responden),
            approved: Number(r.approved), rejected: Number(r.rejected), revoked: Number(r.revoked),
            selesai_cacah: cacah, pct_cacah: pct(cacah, total),
            selesai_approve: approve, pct_approve: pct(approve, total),
          },
        }
      })
      return NextResponse.json({ data, source: 'fasih' }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // ---- Fallback: agregasi dari usaha (skala UMK/UM/UB) ----
    const { searchParams } = new URL(_req.url)
    const skala = searchParams.get('skala')
    const skalaFilter = skala && ['UMK', 'UM', 'UB'].includes(skala) ? skala : null
    const [rows] = await pool.execute(
      `SELECT kdkec, MAX(nmkec) AS nmkec, COUNT(*) AS target_usaha,
         SUM(CASE WHEN status_pencacahan='selesai' THEN 1 ELSE 0 END) AS realisasi,
         COUNT(DISTINCT petugas_id) AS petugas_count,
         SUM(CASE WHEN skala_usaha='UMK' THEN 1 ELSE 0 END) AS umk_target,
         SUM(CASE WHEN skala_usaha='UM'  THEN 1 ELSE 0 END) AS um_target,
         SUM(CASE WHEN skala_usaha='UB'  THEN 1 ELSE 0 END) AS ub_target,
         SUM(CASE WHEN skala_usaha='UMK' AND status_pencacahan='selesai' THEN 1 ELSE 0 END) AS umk_done,
         SUM(CASE WHEN skala_usaha='UM'  AND status_pencacahan='selesai' THEN 1 ELSE 0 END) AS um_done,
         SUM(CASE WHEN skala_usaha='UB'  AND status_pencacahan='selesai' THEN 1 ELSE 0 END) AS ub_done
       FROM usaha ${skalaFilter ? 'WHERE skala_usaha = ?' : ''} GROUP BY kdkec ORDER BY realisasi DESC`,
      skalaFilter ? [skalaFilter] : [],
    ) as [any[], any]
    const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 1000) / 10 : 0
    const data = rows.map((r: any, i: number) => {
      const target = Number(r.target_usaha), real = Number(r.realisasi)
      return {
        id: i + 1, kdkec: r.kdkec, nmkec: r.nmkec, kecamatan: r.nmkec,
        target_usaha: target, realisasi: real, petugas_count: Number(r.petugas_count),
        status: real >= target && target > 0 ? 'selesai' : real > 0 ? 'berlangsung' : 'belum',
        persentase: pct(real, target),
        breakdown: skalaFilter ? null : {
          UMK: { target: Number(r.umk_target), realisasi: Number(r.umk_done), persentase: pct(Number(r.umk_done), Number(r.umk_target)) },
          UM:  { target: Number(r.um_target),  realisasi: Number(r.um_done),  persentase: pct(Number(r.um_done),  Number(r.um_target)) },
          UB:  { target: Number(r.ub_target),  realisasi: Number(r.ub_done),  persentase: pct(Number(r.ub_done),  Number(r.ub_target)) },
        },
      }
    })
    return NextResponse.json({ data, source: 'usaha' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    console.error('[api/progress] error:', e?.message)
    return NextResponse.json({ data: [], error: e?.message ?? 'DB error' })
  }
}
