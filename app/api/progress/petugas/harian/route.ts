import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

/**
 * GET /api/progress/petugas/harian?days=14[&kec=<kode_kec>][&pencacah=<email>]
 * PUBLIC — progress HARIAN (selisih cumulative antar hari) untuk grafik evaluasi.
 *
 * - tanpa kec  → garis agregat kabupaten + garis per-kecamatan (perbandingan).
 * - dengan kec → garis per pencacah di kecamatan itu + agregat kecamatan.
 * - dengan pencacah → hanya pencacah tsb.
 *
 * Email tidak diekspos sbg label (privacy) — pakai nama_ppl. `key` internal pakai email
 * tapi hanya untuk pencocokan series, tidak ditampilkan.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const days = Math.min(60, Math.max(2, Number(sp.get('days') ?? 14)))
  const kec = sp.get('kec') || ''
  const nama = sp.get('nama') || ''   // nama_ppl (email tidak dipakai sbg filter publik)

  try {
    const namaMap = await kecNameMap()

    // Ambil semua snapshot harian dalam scope
    const where: string[] = []
    const params: any[] = []
    if (kec) { where.push('kode_kec = ?'); params.push(kec) }
    if (nama) { where.push('nama_ppl = ?'); params.push(nama) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(tanggal,'%Y-%m-%d') AS tgl, pencacah, kode_kec,
              MAX(nama_ppl) AS nama_ppl, MAX(cum_cacah) AS cum
       FROM fasih_petugas_harian ${whereSql}
       GROUP BY tanggal, pencacah, kode_kec`,
      params,
    ) as [any[], any]

    // daftar kecamatan + petugas untuk filter UI
    const [kecOpt] = await pool.execute(
      `SELECT DISTINCT kode_kec FROM fasih_petugas_harian ORDER BY kode_kec`,
    ) as [any[], any]
    const kecamatanList = kecOpt.map((r: any) => ({ kode_kec: r.kode_kec, nmkec: namaMap.get(String(r.kode_kec)) ?? r.kode_kec }))
    let petugasList: any[] = []
    if (kec) {
      const [pl] = await pool.execute(
        `SELECT nama_ppl FROM fasih_petugas_harian WHERE kode_kec = ? AND nama_ppl IS NOT NULL AND nama_ppl <> '' GROUP BY nama_ppl ORDER BY nama_ppl`, [kec],
      ) as [any[], any]
      petugasList = pl.map((r: any) => ({ nama_ppl: r.nama_ppl }))
    }

    if (rows.length === 0) {
      return NextResponse.json({ dates: [], series: [], aggregate: null, kecamatanList, petugasList }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // distinct dates asc
    const allDates = [...new Set(rows.map((r: any) => r.tgl))].sort()
    // baseline = 1 hari sebelum window tampil; tampil maksimal `days` hari terakhir
    const windowDates = allDates.slice(-(days + 1))
    const displayDates = windowDates.slice(1) // hari pertama jadi baseline saja

    // key = pencacah|kec → { nama_ppl, kode_kec, byDate }
    const keys = new Map<string, { nama_ppl: string; kode_kec: string; byDate: Map<string, number> }>()
    for (const r of rows) {
      const k = `${r.pencacah}|${r.kode_kec}`
      if (!keys.has(k)) keys.set(k, { nama_ppl: r.nama_ppl || r.pencacah, kode_kec: r.kode_kec, byDate: new Map() })
      keys.get(k)!.byDate.set(r.tgl, Number(r.cum))
    }

    // forward-fill cumulative per key sepanjang windowDates, lalu hitung delta harian
    const dailyByKey = new Map<string, number[]>()
    for (const [k, v] of keys) {
      let last = 0
      const filled: number[] = []
      for (const d of windowDates) { if (v.byDate.has(d)) last = v.byDate.get(d)!; filled.push(last) }
      const delta: number[] = []
      for (let i = 1; i < filled.length; i++) delta.push(Math.max(0, filled[i] - filled[i - 1]))
      dailyByKey.set(k, delta)
    }

    const zero = () => displayDates.map(() => 0)
    const addInto = (target: number[], src: number[]) => { for (let i = 0; i < target.length; i++) target[i] += (src[i] ?? 0) }

    let series: any[]
    const aggregateData = zero()

    if (kec) {
      // satu garis per pencacah
      series = [...keys.entries()].map(([k, v]) => {
        const data = dailyByKey.get(k) ?? zero()
        addInto(aggregateData, data)
        return { key: k, name: v.nama_ppl, kode_kec: v.kode_kec, nmkec: namaMap.get(String(v.kode_kec)) ?? v.kode_kec, data }
      }).sort((a, b) => b.data.reduce((x: number, y: number) => x + y, 0) - a.data.reduce((x: number, y: number) => x + y, 0))
    } else {
      // garis per kecamatan (jumlah semua pencacah di kec itu)
      const byKec = new Map<string, number[]>()
      for (const [k, v] of keys) {
        if (!byKec.has(v.kode_kec)) byKec.set(v.kode_kec, zero())
        addInto(byKec.get(v.kode_kec)!, dailyByKey.get(k) ?? [])
      }
      series = [...byKec.entries()].map(([kk, data]) => {
        addInto(aggregateData, data)
        return { key: kk, name: namaMap.get(String(kk)) ?? kk, kode_kec: kk, nmkec: namaMap.get(String(kk)) ?? kk, data }
      }).sort((a, b) => b.data.reduce((x: number, y: number) => x + y, 0) - a.data.reduce((x: number, y: number) => x + y, 0))
    }

    return NextResponse.json({
      dates: displayDates,
      series,
      aggregate: { name: kec ? `Total ${namaMap.get(kec) ?? kec}` : 'Total Kabupaten', data: aggregateData },
      kecamatanList, petugasList,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ dates: [], series: [], aggregate: null, kecamatanList: [], petugasList: [], error: e?.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

async function kecNameMap(): Promise<Map<string, string>> {
  const m = new Map<string, string>()
  try {
    const [rows] = await pool.execute(`SELECT DISTINCT kdkec, nmkec FROM desa`) as [any[], any]
    for (const r of rows) m.set(String(r.kdkec), r.nmkec)
  } catch {}
  return m
}
