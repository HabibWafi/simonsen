import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

/**
 * GET /api/admin/petugas-progress[?kec=<kode_kec>]
 *
 * - tanpa kec → progress per pencacah (tabel fasih_petugas) + daftar pengawas.
 * - dengan kec → agregat per pencacah HANYA di kecamatan itu (dari fasih_subsls).
 * - selalu sertakan daftar kecamatan untuk dropdown filter.
 */
export async function GET(req: NextRequest) {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard

  const kec = req.nextUrl.searchParams.get('kec')
  const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 1000) / 10 : 0

  try {
    // Daftar kecamatan (untuk dropdown) dari fasih_subsls + nama dari desa
    const [namaRows] = await pool.execute(`SELECT DISTINCT kdkec, nmkec FROM desa`) as [any[], any]
    const namaMap = new Map<string, string>()
    for (const r of namaRows) namaMap.set(String(r.kdkec), r.nmkec)
    const [kecRows] = await pool.execute(
      `SELECT DISTINCT kode_kec FROM fasih_subsls WHERE pencacah IS NOT NULL ORDER BY kode_kec`,
    ) as [any[], any]
    const kecamatanList = kecRows.map((r: any) => ({ kode_kec: r.kode_kec, nmkec: namaMap.get(String(r.kode_kec)) ?? r.kode_kec }))

    let petugas: any[]
    if (kec) {
      const [rows] = await pool.execute(
        `SELECT pencacah, MAX(nama_ppl) AS nama_ppl, MAX(nama_pml) AS nama_pml,
                SUM(total) AS total, SUM(selesai_cacah) AS selesai_cacah, SUM(selesai_approve) AS selesai_approve,
                SUM(open) AS open, SUM(draft) AS draft, SUM(submitted_pencacah) AS submitted, SUM(approved) AS approved
         FROM fasih_subsls WHERE kode_kec = ? AND pencacah IS NOT NULL
         GROUP BY pencacah ORDER BY selesai_cacah DESC`,
        [kec],
      ) as [any[], any]
      petugas = rows.map((r: any) => {
        const total = Number(r.total), cacah = Number(r.selesai_cacah), approve = Number(r.selesai_approve)
        return {
          pencacah: r.pencacah, nama_ppl: r.nama_ppl, nama_pml: r.nama_pml,
          total, selesai_cacah: cacah, selesai_approve: approve,
          pct_cacah: pct(cacah, total), pct_approve: pct(approve, total),
          open: Number(r.open), draft: Number(r.draft), submitted: Number(r.submitted), approved: Number(r.approved),
        }
      })
    } else {
      // Sumber sama dgn view per-kec (fasih_subsls) → konsisten.
      const [rows] = await pool.execute(
        `SELECT pencacah, MAX(nama_ppl) AS nama_ppl, MAX(nama_pml) AS nama_pml,
                SUM(total) AS total, SUM(selesai_cacah) AS selesai_cacah, SUM(selesai_approve) AS selesai_approve,
                SUM(open) AS open, SUM(draft) AS draft, SUM(submitted_pencacah) AS submitted, SUM(approved) AS approved
         FROM fasih_subsls WHERE pencacah IS NOT NULL AND pencacah <> ''
         GROUP BY pencacah ORDER BY selesai_cacah DESC`,
      ) as [any[], any]
      petugas = rows.map((r: any) => {
        const total = Number(r.total), cacah = Number(r.selesai_cacah), approve = Number(r.selesai_approve)
        return {
          pencacah: r.pencacah, nama_ppl: r.nama_ppl, nama_pml: r.nama_pml,
          total, selesai_cacah: cacah, selesai_approve: approve,
          pct_cacah: pct(cacah, total), pct_approve: pct(approve, total),
          open: Number(r.open), draft: Number(r.draft), submitted: Number(r.submitted), approved: Number(r.approved),
        }
      })
    }

    const [pengawasRows] = await pool.execute(
      `SELECT pengawas, nama_pml, jumlah_ppl, jumlah_unit AS total, target, selesai_cacah, selesai_approve, pct_cacah, pct_approve
       FROM fasih_pengawas ORDER BY selesai_cacah DESC`,
    ) as [any[], any]

    return NextResponse.json({ petugas, pengawas: pengawasRows, kecamatanList })
  } catch (e: any) {
    return NextResponse.json({ petugas: [], pengawas: [], kecamatanList: [], error: e?.message }, { status: 500 })
  }
}
