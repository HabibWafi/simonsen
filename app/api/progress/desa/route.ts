import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/progress/desa?kec=<kode_kec 7-digit>
 * Agregat per-desa. Sumber utama fasih_desa; fallback agregasi usaha.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const kdkec = url.searchParams.get('kec')
  const skala = url.searchParams.get('skala')
  const skalaFilter = skala && ['UMK', 'UM', 'UB'].includes(skala) ? skala : null
  if (!kdkec) return NextResponse.json({ error: 'Param `kec` wajib' }, { status: 400 })

  const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 1000) / 10 : 0

  try {
    const [fasih] = await pool.execute(
      `SELECT kode_desa, kode_kec, total, open, draft, submitted_pencacah, submitted_responden,
              approved, rejected, revoked, edited_pengawas, completed_admin, edited_admin,
              selesai_cacah, selesai_approve
       FROM fasih_desa WHERE kode_kec = ? ORDER BY selesai_cacah DESC`,
      [kdkec],
    ) as [any[], any]

    if (fasih.length > 0) {
      // nama desa dari fasih_subsls (sumber Fasih) atau tabel desa
      const [namaRows] = await pool.execute(
        `SELECT kode_desa, MAX(nama_desa) AS nm FROM fasih_subsls WHERE kode_kec = ? GROUP BY kode_desa`, [kdkec],
      ) as [any[], any]
      const nm = new Map<string, string>()
      for (const r of namaRows) if (r.nm) nm.set(String(r.kode_desa), r.nm)

      const data = fasih.map((r: any) => {
        const total = Number(r.total), cacah = Number(r.selesai_cacah), approve = Number(r.selesai_approve)
        return {
          kddesa: r.kode_desa,
          iddesa: r.kode_desa,
          nmdesa: nm.get(String(r.kode_desa)) ?? String(r.kode_desa),
          kdkec: r.kode_kec,
          target_usaha: total,
          realisasi: cacah,
          persentase: pct(cacah, total),
          breakdown: null,
          fasih: {
            open: Number(r.open), draft: Number(r.draft), submitted: Number(r.submitted_pencacah),
            submitted_responden: Number(r.submitted_responden),
            approved: Number(r.approved), rejected: Number(r.rejected), revoked: Number(r.revoked),
            completed_admin: Number(r.completed_admin), edited_admin: Number(r.edited_admin),
            edited_pengawas: Number(r.edited_pengawas),
            selesai_cacah: cacah, pct_cacah: pct(cacah, total),
            selesai_approve: approve, pct_approve: pct(approve, total),
          },
        }
      })
      return NextResponse.json({ data, source: 'fasih' }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // ---- Fallback usaha ----
    const params: any[] = [kdkec]
    let sql = `
      SELECT kddesa, MAX(nmdesa) AS nmdesa, kdkec,
        COUNT(*) AS target_usaha,
        SUM(CASE WHEN status_pencacahan='selesai' THEN 1 ELSE 0 END) AS realisasi,
        SUM(CASE WHEN skala_usaha='UMK' THEN 1 ELSE 0 END) AS umk_target,
        SUM(CASE WHEN skala_usaha='UM'  THEN 1 ELSE 0 END) AS um_target,
        SUM(CASE WHEN skala_usaha='UB'  THEN 1 ELSE 0 END) AS ub_target,
        SUM(CASE WHEN skala_usaha='UMK' AND status_pencacahan='selesai' THEN 1 ELSE 0 END) AS umk_done,
        SUM(CASE WHEN skala_usaha='UM'  AND status_pencacahan='selesai' THEN 1 ELSE 0 END) AS um_done,
        SUM(CASE WHEN skala_usaha='UB'  AND status_pencacahan='selesai' THEN 1 ELSE 0 END) AS ub_done
      FROM usaha WHERE kdkec = ?`
    if (skalaFilter) { sql += ' AND skala_usaha = ?'; params.push(skalaFilter) }
    sql += ' GROUP BY kddesa, kdkec ORDER BY realisasi DESC'
    const [rows] = await pool.execute(sql, params) as [any[], any]
    const data = rows.map((r: any) => {
      const target = Number(r.target_usaha), real = Number(r.realisasi)
      const kddesaStr = String(r.kddesa ?? '')
      const iddesa = kddesaStr.length >= 10 ? kddesaStr : `${r.kdkec ?? ''}${kddesaStr}`
      return {
        kddesa: r.kddesa, iddesa, nmdesa: r.nmdesa, kdkec: r.kdkec,
        target_usaha: target, realisasi: real, persentase: pct(real, target),
        breakdown: skalaFilter ? null : {
          UMK: { target: Number(r.umk_target), realisasi: Number(r.umk_done), persentase: pct(Number(r.umk_done), Number(r.umk_target)) },
          UM:  { target: Number(r.um_target),  realisasi: Number(r.um_done),  persentase: pct(Number(r.um_done),  Number(r.um_target)) },
          UB:  { target: Number(r.ub_target),  realisasi: Number(r.ub_done),  persentase: pct(Number(r.ub_done),  Number(r.ub_target)) },
        },
      }
    })
    return NextResponse.json({ data, source: 'usaha' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e.message }, { status: 500 })
  }
}
