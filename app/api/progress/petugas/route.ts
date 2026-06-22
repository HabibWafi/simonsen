import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { weekBuckets, prevEndOf } from '@/lib/weeks'

/**
 * GET /api/progress/petugas[?kec=<kode_kec>][?week=<YYYY-MM-DD start minggu>]
 * PUBLIC — progress per petugas (PPL).
 *
 * - Tanpa `week` (Seluruh Waktu): agregat cumulative dari fasih_subsls (kondisi
 *   terkini). SUMBER TUNGGAL → angka konsisten dengan rekap & PML→PPL.
 * - Dengan `week` (Minggu ke-N): progress KHUSUS minggu itu (selisih cumulative
 *   harian dari fasih_petugas_harian: cum akhir minggu − cum akhir minggu sebelumnya).
 *   Dipakai untuk PERINGKAT MINGGUAN — tiap minggu dihitung ulang, jadi petugas
 *   yang tertinggal tetap punya peluang menang tiap minggu.
 *
 * Email tidak diekspos.
 */
const noStore = { headers: { 'Cache-Control': 'no-store' } }

export async function GET(req: NextRequest) {
  const kec = req.nextUrl.searchParams.get('kec')
  const week = req.nextUrl.searchParams.get('week') || ''
  const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 1000) / 10 : 0
  const weeks = weekBuckets()

  try {
    const [namaRows] = await pool.execute(`SELECT DISTINCT kdkec, nmkec FROM desa`) as [any[], any]
    const namaMap = new Map<string, string>()
    for (const r of namaRows) namaMap.set(String(r.kdkec), r.nmkec)

    const [kecRows] = await pool.execute(
      `SELECT DISTINCT kode_kec FROM fasih_subsls WHERE pencacah IS NOT NULL AND pencacah <> '' ORDER BY kode_kec`,
    ) as [any[], any]
    const kecamatanList = kecRows.map((r: any) => ({ kode_kec: r.kode_kec, nmkec: namaMap.get(String(r.kode_kec)) ?? r.kode_kec }))

    // ── MODE MINGGUAN: progress khusus minggu terpilih (delta cumulative harian) ──
    if (week) {
      const idx = weeks.findIndex(w => w.start === week)
      if (idx < 0) {
        return NextResponse.json({ petugas: [], kecamatanList, weeks, mode: 'week', week: null }, noStore)
      }
      const wk = weeks[idx]
      const prevEnd = prevEndOf(weeks, idx)

      const params: any[] = []
      const whereSql = kec ? 'WHERE kode_kec = ?' : ''
      if (kec) params.push(kec)
      const [rows] = await pool.execute(
        `SELECT DATE_FORMAT(tanggal,'%Y-%m-%d') AS tgl, pencacah, kode_kec,
                MAX(nama_ppl) AS nama_ppl, MAX(nama_pml) AS nama_pml,
                MAX(total) AS total, MAX(cum_cacah) AS cum_cacah, MAX(cum_approve) AS cum_approve
         FROM fasih_petugas_harian ${whereSql}
         GROUP BY tanggal, pencacah, kode_kec`,
        params,
      ) as [any[], any]

      // key = pencacah|kode_kec → cumulative per tanggal
      type Snap = { d: string; c: number; a: number; t: number }
      const keys = new Map<string, { nama_ppl: string; nama_pml: string; kode_kec: string; byDate: Map<string, Snap> }>()
      for (const r of rows) {
        const k = `${r.pencacah}|${r.kode_kec}`
        if (!keys.has(k)) keys.set(k, { nama_ppl: r.nama_ppl || r.pencacah, nama_pml: r.nama_pml || '', kode_kec: String(r.kode_kec), byDate: new Map() })
        keys.get(k)!.byDate.set(r.tgl, { d: r.tgl, c: Number(r.cum_cacah), a: Number(r.cum_approve), t: Number(r.total) })
      }
      const cumAt = (sorted: Snap[], target: string, field: 'c' | 'a' | 't') => {
        let last = 0
        for (const e of sorted) { if (e.d <= target) last = e[field]; else break }
        return last
      }

      // agregasi per pencacah (jumlahkan delta lintas kec bila tanpa filter kec)
      const byP = new Map<string, { nama_ppl: string; nama_pml: string; kode_kec: string; total: number; cacah: number; approve: number }>()
      for (const [k, v] of keys) {
        const sorted = [...v.byDate.values()].sort((a, b) => a.d < b.d ? -1 : 1)
        const wc = Math.max(0, cumAt(sorted, wk.end, 'c') - cumAt(sorted, prevEnd, 'c'))
        const wa = Math.max(0, cumAt(sorted, wk.end, 'a') - cumAt(sorted, prevEnd, 'a'))
        const tot = cumAt(sorted, wk.end, 't')
        const pen = k.split('|')[0]
        if (!byP.has(pen)) byP.set(pen, { nama_ppl: v.nama_ppl, nama_pml: v.nama_pml, kode_kec: v.kode_kec, total: 0, cacah: 0, approve: 0 })
        const o = byP.get(pen)!
        o.cacah += wc; o.approve += wa; o.total += tot
        if (!o.nama_ppl || o.nama_ppl === pen) o.nama_ppl = v.nama_ppl
        if (!o.nama_pml) o.nama_pml = v.nama_pml
      }

      const petugas = [...byP.values()].map(o => ({
        nama_ppl: o.nama_ppl || '—', nama_pml: o.nama_pml || '—',
        nmkec: kec ? (namaMap.get(String(o.kode_kec)) ?? '') : '',
        total: o.total, draft: null,            // draft/rejected/revoked per-minggu tidak tersedia di snapshot harian
        rejected: null, revoked: null,
        selesai_cacah: o.cacah, selesai_approve: o.approve,
        pct_cacah: pct(o.cacah, o.total), pct_approve: pct(o.approve, o.total),
      })).sort((a, b) => b.selesai_cacah - a.selesai_cacah)

      return NextResponse.json({ petugas, kecamatanList, weeks, mode: 'week', week: wk }, noStore)
    }

    // ── MODE SELURUH WAKTU: kondisi cumulative terkini (fasih_subsls) ──
    const params: any[] = []
    let groupBy = 'pencacah'
    let kecCol = `'' AS kode_kec`
    if (kec) { params.push(kec); groupBy = 'pencacah, kode_kec'; kecCol = 'kode_kec' }
    const [rows] = await pool.execute(
      `SELECT MAX(nama_ppl) AS nama_ppl, MAX(nama_pml) AS nama_pml, ${kecCol},
              SUM(total) AS total, SUM(draft) AS draft,
              SUM(rejected) AS rejected, SUM(revoked) AS revoked,
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
        total, draft: Number(r.draft), rejected: Number(r.rejected), revoked: Number(r.revoked),
        selesai_cacah: cacah, selesai_approve: approve,
        pct_cacah: pct(cacah, total), pct_approve: pct(approve, total),
      }
    })

    return NextResponse.json({ petugas, kecamatanList, weeks, mode: 'all', week: null }, noStore)
  } catch (e: any) {
    return NextResponse.json({ petugas: [], kecamatanList: [], weeks, error: e?.message }, { status: 500, ...noStore })
  }
}
