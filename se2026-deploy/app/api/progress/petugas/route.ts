import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/progress/petugas[?kec=<kode_kec>]
 * PUBLIC — progress per petugas (PPL) untuk monitoring di halaman progress.
 * Email TIDAK diekspos (privacy) — hanya nama + metrik. Bisa difilter per kecamatan.
 */
export async function GET(req: NextRequest) {
  const kec = req.nextUrl.searchParams.get('kec')
  const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 1000) / 10 : 0

  try {
    // daftar kecamatan untuk dropdown (dari fasih_subsls + nama dari desa)
    const [namaRows] = await pool.execute(`SELECT DISTINCT kdkec, nmkec FROM desa`) as [any[], any]
    const namaMap = new Map<string, string>()
    for (const r of namaRows) namaMap.set(String(r.kdkec), r.nmkec)
    const [kecRows] = await pool.execute(
      `SELECT DISTINCT kode_kec FROM fasih_subsls WHERE pencacah IS NOT NULL AND pencacah <> '' ORDER BY kode_kec`,
    ) as [any[], any]
    const kecamatanList = kecRows.map((r: any) => ({ kode_kec: r.kode_kec, nmkec: namaMap.get(String(r.kode_kec)) ?? r.kode_kec }))

    let petugas: any[]
    if (kec) {
      const [rows] = await pool.execute(
        `SELECT MAX(nama_ppl) AS nama_ppl, MAX(nama_pml) AS nama_pml, kode_kec,
                SUM(total) AS total, SUM(draft) AS draft, SUM(selesai_cacah) AS selesai_cacah, SUM(selesai_approve) AS selesai_approve
         FROM fasih_subsls WHERE kode_kec = ? AND pencacah IS NOT NULL AND pencacah <> ''
         GROUP BY pencacah, kode_kec ORDER BY selesai_cacah DESC`, [kec],
      ) as [any[], any]
      petugas = rows.map((r: any) => mapRow(r, namaMap, pct))
    } else {
      // total per pencacah lintas kecamatan (dari fasih_petugas)
      const [rows] = await pool.execute(
        `SELECT nama_ppl, nama_pml, jumlah_unit AS total, target, draft,
                selesai_cacah, selesai_approve, pct_cacah, pct_approve
         FROM fasih_petugas ORDER BY selesai_cacah DESC`,
      ) as [any[], any]
      petugas = rows.map((r: any) => ({
        nama_ppl: r.nama_ppl || '—', nama_pml: r.nama_pml || '—', nmkec: '',
        total: Number(r.target || r.total), draft: Number(r.draft),
        selesai_cacah: Number(r.selesai_cacah),
        selesai_approve: Number(r.selesai_approve),
        pct_cacah: Number(r.pct_cacah), pct_approve: Number(r.pct_approve),
      }))
    }

    return NextResponse.json({ petugas, kecamatanList }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ petugas: [], kecamatanList: [], error: e?.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

function mapRow(r: any, namaMap: Map<string, string>, pct: (a: number, t: number) => number) {
  const total = Number(r.total), cacah = Number(r.selesai_cacah), approve = Number(r.selesai_approve)
  return {
    nama_ppl: r.nama_ppl || '—', nama_pml: r.nama_pml || '—',
    nmkec: namaMap.get(String(r.kode_kec)) ?? '',
    total, draft: Number(r.draft), selesai_cacah: cacah, selesai_approve: approve,
    pct_cacah: pct(cacah, total), pct_approve: pct(approve, total),
  }
}
