import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/progress/petugas[?kec=<kode_kec>]
 * PUBLIC — progress per petugas (PPL).
 *
 * SUMBER TUNGGAL: fasih_subsls (agregat per pencacah). Baik tampilan "semua
 * kecamatan" maupun filter kecamatan memakai sumber yang sama → angka konsisten,
 * dan PML→PPL juga konsisten. Email tidak diekspos.
 */
export async function GET(req: NextRequest) {
  const kec = req.nextUrl.searchParams.get('kec')
  const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 1000) / 10 : 0

  try {
    const [namaRows] = await pool.execute(`SELECT DISTINCT kdkec, nmkec FROM desa`) as [any[], any]
    const namaMap = new Map<string, string>()
    for (const r of namaRows) namaMap.set(String(r.kdkec), r.nmkec)

    const [kecRows] = await pool.execute(
      `SELECT DISTINCT kode_kec FROM fasih_subsls WHERE pencacah IS NOT NULL AND pencacah <> '' ORDER BY kode_kec`,
    ) as [any[], any]
    const kecamatanList = kecRows.map((r: any) => ({ kode_kec: r.kode_kec, nmkec: namaMap.get(String(r.kode_kec)) ?? r.kode_kec }))

    // Agregat per pencacah. Kalau ada kec → grup per (pencacah, kode_kec) supaya
    // angkanya khusus wilayah itu; kalau tidak → total lintas wilayah per pencacah.
    const params: any[] = []
    let groupBy = 'pencacah'
    let kecCol = `'' AS kode_kec`
    if (kec) { params.push(kec); groupBy = 'pencacah, kode_kec'; kecCol = 'kode_kec' }
    const [rows] = await pool.execute(
      `SELECT MAX(nama_ppl) AS nama_ppl, MAX(nama_pml) AS nama_pml, ${kecCol},
              SUM(total) AS total, SUM(draft) AS draft,
              SUM(selesai_cacah) AS selesai_cacah, SUM(selesai_approve) AS selesai_approve
       FROM fasih_subsls
       WHERE pencacah IS NOT NULL AND pencacah <> '' ${kec ? 'AND kode_kec = ?' : ''}
       GROUP BY ${groupBy}
       ORDER BY selesai_cacah DESC`,
      params,
    ) as [any[], any]

    const petugas = rows.map((r: any) => {
      const total = Number(r.total), cacah = Number(r.selesai_cacah), approve = Number(r.selesai_approve)
      return {
        nama_ppl: r.nama_ppl || '—', nama_pml: r.nama_pml || '—',
        nmkec: kec ? (namaMap.get(String(r.kode_kec)) ?? '') : '',
        total, draft: Number(r.draft), selesai_cacah: cacah, selesai_approve: approve,
        pct_cacah: pct(cacah, total), pct_approve: pct(approve, total),
      }
    })

    return NextResponse.json({ petugas, kecamatanList }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ petugas: [], kecamatanList: [], error: e?.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
