import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { cachedJson, cacheHeaders } from '@/lib/cache'

/**
 * GET /api/progress/pengawas[?kec=<kode_kec>]
 * PUBLIC — monitoring aktivitas pengawas (PML). Tanpa email.
 *
 * Agregasi dari fasih_subsls GROUP BY (pengawas, kode_kec). Menunjukkan berapa
 * unit yang di-submit PPL, di-approve/finalisasi, di-reject, dan di-edit pengawas.
 *   submitted = submitted_pencacah + submitted_responden
 *   approved  = selesai_approve (approved + completed_admin + edited_admin)
 *   rejected, revoked, edited_pengawas per status
 */
const noStore = { headers: { 'Cache-Control': 'no-store' } }

export async function GET(req: NextRequest) {
  const kec = req.nextUrl.searchParams.get('kec')
  const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 1000) / 10 : 0

  try {
    const body = await cachedJson(`pengawas:${kec ?? ''}`, 30_000, async () => {
    const [namaRows] = await pool.execute(`SELECT DISTINCT kdkec, nmkec FROM desa`) as [any[], any]
    const namaMap = new Map<string, string>()
    for (const r of namaRows) namaMap.set(String(r.kdkec), r.nmkec)

    const [kecRows] = await pool.execute(
      `SELECT DISTINCT kode_kec FROM fasih_subsls WHERE pengawas IS NOT NULL AND pengawas <> '' ORDER BY kode_kec`,
    ) as [any[], any]
    const kecamatanList = kecRows.map((r: any) => ({ kode_kec: r.kode_kec, nmkec: namaMap.get(String(r.kode_kec)) ?? r.kode_kec }))

    const params: any[] = []
    if (kec) params.push(kec)
    const [rows] = await pool.execute(
      `SELECT MAX(nama_pml) AS nama_pml, kode_kec,
              COUNT(DISTINCT pencacah) AS jumlah_ppl,
              SUM(total) AS jumlah_unit,
              SUM(submitted_pencacah + submitted_responden) AS submitted,
              SUM(rejected) AS rejected, SUM(revoked) AS revoked,
              SUM(edited_pengawas) AS edited_pengawas,
              SUM(selesai_cacah) AS selesai_cacah, SUM(selesai_approve) AS selesai_approve
       FROM fasih_subsls
       WHERE pengawas IS NOT NULL AND pengawas <> '' ${kec ? 'AND kode_kec = ?' : ''}
       GROUP BY pengawas, kode_kec
       ORDER BY selesai_cacah DESC`,
      params,
    ) as [any[], any]

    const pengawas = rows.map((r: any) => {
      const unit = Number(r.jumlah_unit), cacah = Number(r.selesai_cacah), approve = Number(r.selesai_approve)
      return {
        nama_pml: r.nama_pml || '—',
        nmkec: namaMap.get(String(r.kode_kec)) ?? String(r.kode_kec),
        jumlah_ppl: Number(r.jumlah_ppl), jumlah_unit: unit,
        submitted: Number(r.submitted), approved: approve,
        rejected: Number(r.rejected), revoked: Number(r.revoked),
        edited_pengawas: Number(r.edited_pengawas),
        selesai_cacah: cacah, pct_cacah: pct(cacah, unit), pct_approve: pct(approve, unit),
      }
    })

    return { pengawas, kecamatanList }
    })
    return NextResponse.json(body, { headers: cacheHeaders(30) })
  } catch (e: any) {
    return NextResponse.json({ pengawas: [], kecamatanList: [], error: e?.message }, { status: 500, ...noStore })
  }
}
