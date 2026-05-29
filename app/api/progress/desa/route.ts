import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/progress/desa?kec=1605030&skala=UMK
 * Returns aggregate per-desa untuk kecamatan tertentu.
 * Saat skala kosong → sertakan breakdown 3-skala per desa.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const kdkec = url.searchParams.get('kec')
  const skala = url.searchParams.get('skala')
  const skalaFilter = skala && ['UMK', 'UM', 'UB'].includes(skala) ? skala : null

  if (!kdkec) {
    return NextResponse.json({ error: 'Param `kec` (kdkec) wajib' }, { status: 400 })
  }

  try {
    const params: any[] = [kdkec]
    let sql = `
      SELECT
        kddesa,
        nmdesa,
        kdkec,
        COUNT(*) AS target_usaha,
        SUM(CASE WHEN status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS realisasi,
        SUM(CASE WHEN skala_usaha = 'UMK' THEN 1 ELSE 0 END) AS umk_target,
        SUM(CASE WHEN skala_usaha = 'UM'  THEN 1 ELSE 0 END) AS um_target,
        SUM(CASE WHEN skala_usaha = 'UB'  THEN 1 ELSE 0 END) AS ub_target,
        SUM(CASE WHEN skala_usaha = 'UMK' AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS umk_done,
        SUM(CASE WHEN skala_usaha = 'UM'  AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS um_done,
        SUM(CASE WHEN skala_usaha = 'UB'  AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS ub_done
      FROM usaha
      WHERE kdkec = ?
    `
    if (skalaFilter) {
      sql += ' AND skala_usaha = ?'
      params.push(skalaFilter)
    }
    sql += ' GROUP BY kddesa, nmdesa, kdkec ORDER BY realisasi DESC'

    const [rows] = await pool.execute(sql, params) as [any[], any]

    const pct = (real: number, t: number) => t > 0 ? Math.round((real / t) * 1000) / 10 : 0
    const data = rows.map((r: any) => {
      const target = Number(r.target_usaha)
      const real = Number(r.realisasi)
      const umkT = Number(r.umk_target), umkD = Number(r.umk_done)
      const umT  = Number(r.um_target),  umD  = Number(r.um_done)
      const ubT  = Number(r.ub_target),  ubD  = Number(r.ub_done)
      return {
        kddesa: r.kddesa,
        nmdesa: r.nmdesa,
        kdkec: r.kdkec,
        target_usaha: target,
        realisasi: real,
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
    return NextResponse.json({ data: [], error: e.message }, { status: 500 })
  }
}
