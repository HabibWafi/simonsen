import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { cachedJson, cacheHeaders } from '@/lib/cache'

/**
 * GET /api/progress/petugas/harian
 *   ?mode=daily|weekly        (default daily)
 *   ?kec=<kode_kec>           filter kecamatan → seri per petugas
 *   ?nama=<nama_ppl>          filter satu petugas
 *   daily:  ?days=14  ATAU  ?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   weekly: bucket Senin–Minggu mulai 2026-06-15 s/d 2026-08-31 (tutup tiap Minggu)
 *
 * Progress harian = selisih cumulative antar hari.
 * Progress mingguan = cumulative akhir minggu − cumulative akhir minggu sebelumnya
 *   (robust thd hari yang terlewat: pakai cumulative, bukan jumlah delta harian).
 */

const WEEK_START = '2026-06-15'   // Senin
const WEEK_END_CAP = '2026-08-31'
const ID_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const fmtShort = (iso: string) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${ID_MONTH[Number(m) - 1]}` }
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
const todayWib = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

function weekBuckets() {
  const out: { n: number; start: string; end: string; label: string }[] = []
  const today = todayWib()
  let start = WEEK_START, n = 1
  while (start <= WEEK_END_CAP) {
    const end = addDays(start, 6)
    if (start <= today) out.push({ n, start, end, label: `M${n} (${fmtShort(start)}–${fmtShort(end)})` })
    start = addDays(start, 7); n++
  }
  return out
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const mode = sp.get('mode') === 'weekly' ? 'weekly' : 'daily'
  const kec = sp.get('kec') || ''
  const nama = sp.get('nama') || ''
  const days = Math.min(90, Math.max(2, Number(sp.get('days') ?? 14)))
  const from = (sp.get('from') || '').match(/^\d{4}-\d{2}-\d{2}$/) ? sp.get('from')! : ''
  const to = (sp.get('to') || '').match(/^\d{4}-\d{2}-\d{2}$/) ? sp.get('to')! : ''

  const cacheKey = `harian:${mode}:${kec}:${nama}:${days}:${from}:${to}`
  try {
    const body = await cachedJson(cacheKey, 30_000, async () => {
    const namaMap = await kecNameMap()
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

    // filter UI
    const [kecOpt] = await pool.execute(`SELECT DISTINCT kode_kec FROM fasih_petugas_harian ORDER BY kode_kec`) as [any[], any]
    const kecamatanList = kecOpt.map((r: any) => ({ kode_kec: r.kode_kec, nmkec: namaMap.get(String(r.kode_kec)) ?? r.kode_kec }))
    let petugasList: any[] = []
    if (kec) {
      const [pl] = await pool.execute(
        `SELECT nama_ppl FROM fasih_petugas_harian WHERE kode_kec = ? AND nama_ppl IS NOT NULL AND nama_ppl <> '' GROUP BY nama_ppl ORDER BY nama_ppl`, [kec],
      ) as [any[], any]
      petugasList = pl.map((r: any) => ({ nama_ppl: r.nama_ppl }))
    }

    const base = { kecamatanList, petugasList, mode }
    if (rows.length === 0) return { ...base, dates: [], series: [], aggregate: null }

    // key = pencacah|kec → byDate cum
    const keys = new Map<string, { nama_ppl: string; kode_kec: string; byDate: Map<string, number>; sorted: { d: string; c: number }[] }>()
    for (const r of rows) {
      const k = `${r.pencacah}|${r.kode_kec}`
      if (!keys.has(k)) keys.set(k, { nama_ppl: r.nama_ppl || r.pencacah, kode_kec: r.kode_kec, byDate: new Map(), sorted: [] })
      keys.get(k)!.byDate.set(r.tgl, Number(r.cum))
    }
    for (const v of keys.values()) v.sorted = [...v.byDate.entries()].map(([d, c]) => ({ d, c })).sort((a, b) => a.d < b.d ? -1 : 1)
    // cum pada/atau sebelum tanggal target (forward-fill)
    const cumAt = (sorted: { d: string; c: number }[], target: string) => {
      let last = 0
      for (const e of sorted) { if (e.d <= target) last = e.c; else break }
      return last
    }

    const zero = (n: number) => Array(n).fill(0)
    const addInto = (t: number[], s: number[]) => { for (let i = 0; i < t.length; i++) t[i] += (s[i] ?? 0) }

    if (mode === 'weekly') {
      const weeks = weekBuckets()
      const labels = weeks.map(w => w.label)
      const aggregate = zero(weeks.length)
      const perKey = new Map<string, number[]>()
      for (const [k, v] of keys) {
        const data = weeks.map((w, i) => {
          const prevEnd = i === 0 ? addDays(w.start, -1) : weeks[i - 1].end
          return Math.max(0, cumAt(v.sorted, w.end) - cumAt(v.sorted, prevEnd))
        })
        perKey.set(k, data)
      }
      let series: any[]
      if (kec) {
        series = [...keys.entries()].map(([k, v]) => { const d = perKey.get(k)!; addInto(aggregate, d); return { key: k, name: v.nama_ppl, nmkec: namaMap.get(String(v.kode_kec)) ?? v.kode_kec, data: d } })
      } else {
        const byKec = new Map<string, number[]>()
        for (const [k, v] of keys) { if (!byKec.has(v.kode_kec)) byKec.set(v.kode_kec, zero(weeks.length)); addInto(byKec.get(v.kode_kec)!, perKey.get(k)!) }
        series = [...byKec.entries()].map(([kk, d]) => { addInto(aggregate, d); return { key: kk, name: namaMap.get(String(kk)) ?? kk, nmkec: namaMap.get(String(kk)) ?? kk, data: d } })
      }
      series.sort((a, b) => b.data.reduce((x: number, y: number) => x + y, 0) - a.data.reduce((x: number, y: number) => x + y, 0))
      return { ...base, dates: labels, series, aggregate: { name: kec ? `Total ${namaMap.get(kec) ?? kec}` : 'Total Kabupaten', data: aggregate } }
    }

    // ---- DAILY ----
    const allDates = [...new Set(rows.map((r: any) => r.tgl))].sort()
    // window: from/to atau N hari terakhir; baseline = 1 hari snapshot sebelum window
    let windowDates: string[]
    if (from || to) {
      const lo = from || allDates[0], hi = to || allDates[allDates.length - 1]
      const inRange = allDates.filter(d => d >= lo && d <= hi)
      const baselineIdx = allDates.findIndex(d => d === inRange[0]) - 1
      windowDates = (baselineIdx >= 0 ? [allDates[baselineIdx]] : []).concat(inRange)
    } else {
      windowDates = allDates.slice(-(days + 1))
    }
    const displayDates = windowDates.length > 1 ? windowDates.slice(1) : windowDates
    const baseDate = windowDates.length > 1 ? windowDates[0] : null

    const perKeyD = new Map<string, number[]>()
    for (const [k, v] of keys) {
      const filled = windowDates.map(d => cumAt(v.sorted, d))
      const delta: number[] = []
      for (let i = 1; i < filled.length; i++) delta.push(Math.max(0, filled[i] - filled[i - 1]))
      if (!baseDate && filled.length === 1) delta.push(filled[0]) // edge: 1 tanggal saja
      perKeyD.set(k, delta)
    }
    const aggregate = zero(displayDates.length)
    let series: any[]
    if (kec) {
      series = [...keys.entries()].map(([k, v]) => { const d = perKeyD.get(k) ?? zero(displayDates.length); addInto(aggregate, d); return { key: k, name: v.nama_ppl, nmkec: namaMap.get(String(v.kode_kec)) ?? v.kode_kec, data: d } })
    } else {
      const byKec = new Map<string, number[]>()
      for (const [k, v] of keys) { if (!byKec.has(v.kode_kec)) byKec.set(v.kode_kec, zero(displayDates.length)); addInto(byKec.get(v.kode_kec)!, perKeyD.get(k) ?? []) }
      series = [...byKec.entries()].map(([kk, d]) => { addInto(aggregate, d); return { key: kk, name: namaMap.get(String(kk)) ?? kk, nmkec: namaMap.get(String(kk)) ?? kk, data: d } })
    }
    series.sort((a, b) => b.data.reduce((x: number, y: number) => x + y, 0) - a.data.reduce((x: number, y: number) => x + y, 0))
    return {
      ...base,
      dates: displayDates.map(fmtShort),
      datesRaw: displayDates,
      series,
      aggregate: { name: kec ? `Total ${namaMap.get(kec) ?? kec}` : 'Total Kabupaten', data: aggregate },
    }
    })
    return NextResponse.json(body, { headers: cacheHeaders(30) })
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
