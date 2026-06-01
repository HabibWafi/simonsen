import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/progress/sls?desa=<10-digit composed iddesa>&skala=<UMK|UM|UB>
 * Aggregate per kdsls dari tabel `usaha` untuk satu desa tertentu.
 * Saat skala kosong → sertakan breakdown 3-skala per SLS.
 *
 * Catatan: `usaha.kdsls` umumnya tersimpan sebagai 4-digit lokal (mis. "0004").
 * Kita pakai filter `CONCAT(kdprov,kdkab,kdkec,kddesa) = ?` agar tahan format
 * apa pun di kolom kdsls.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const iddesa = url.searchParams.get('desa')
  const skala = url.searchParams.get('skala')
  const skalaFilter = skala && ['UMK', 'UM', 'UB'].includes(skala) ? skala : null

  if (!iddesa) {
    return NextResponse.json({ error: 'Param `desa` (iddesa 10-digit) wajib' }, { status: 400 })
  }

  try {
    const params: any[] = [iddesa]
    let sql = `
      SELECT
        kdsls,
        MAX(nmsls) AS nmsls,
        kdprov, kdkab, kdkec, kddesa,
        COUNT(*) AS target_usaha,
        SUM(CASE WHEN status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS realisasi,
        SUM(CASE WHEN skala_usaha = 'UMK' THEN 1 ELSE 0 END) AS umk_target,
        SUM(CASE WHEN skala_usaha = 'UM'  THEN 1 ELSE 0 END) AS um_target,
        SUM(CASE WHEN skala_usaha = 'UB'  THEN 1 ELSE 0 END) AS ub_target,
        SUM(CASE WHEN skala_usaha = 'UMK' AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS umk_done,
        SUM(CASE WHEN skala_usaha = 'UM'  AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS um_done,
        SUM(CASE WHEN skala_usaha = 'UB'  AND status_pencacahan = 'selesai' THEN 1 ELSE 0 END) AS ub_done
      FROM usaha
      WHERE CONCAT(kdprov, kdkab, kdkec, kddesa) = ?
    `
    if (skalaFilter) {
      sql += ' AND skala_usaha = ?'
      params.push(skalaFilter)
    }
    sql += ' GROUP BY kdsls, kdprov, kdkab, kdkec, kddesa ORDER BY realisasi DESC'

    const [rows] = await pool.execute(sql, params) as [any[], any]

    const pct = (real: number, t: number) => t > 0 ? Math.round((real / t) * 1000) / 10 : 0

    const data = rows.map((r: any) => {
      const target = Number(r.target_usaha)
      const real = Number(r.realisasi)
      const umkT = Number(r.umk_target), umkD = Number(r.umk_done)
      const umT  = Number(r.um_target),  umD  = Number(r.um_done)
      const ubT  = Number(r.ub_target),  ubD  = Number(r.ub_done)
      const idsls = `${r.kdprov}${r.kdkab}${r.kdkec}${r.kddesa}${r.kdsls ?? ''}`
      return {
        idsls,                               // 14-digit komposit untuk match geojson
        kdsls: r.kdsls ?? '',
        nmsls: r.nmsls ?? '',
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
    return NextResponse.json({ data: [], error: e?.message ?? 'DB error' }, { status: 500 })
  }
}
