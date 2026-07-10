import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pool from '@/lib/db'

export const runtime = 'nodejs'

/**
 * GET /api/progress/sls?desa=<iddesa 10-digit>[&skala=UMK|UM|UB][&geojson=1]
 *
 * Performance:
 *  - GeoJSON SLS (4 MB) di-load SEKALI di module scope lalu di-index lazy
 *    ke Map<iddesa, Feature[]>. Request berikutnya hanya lookup map.
 *  - Sertakan `geojson` dalam response yang sama (1 round-trip dari client).
 *  - PII / field tidak dipakai dibuang (nm_ketua, luas, fid, idsubsls, dll).
 *  - Cache header 5 menit browser, 10 menit edge.
 *
 * Output: { data: SlsRow[], geojson?: FeatureCollection }
 */

const ALLOWED_PROPS = new Set([
  'idsls', 'kdsls', 'nmsls',
  'kdprov', 'kdkab', 'kdkec', 'kddesa',
  'nmprov', 'nmkab', 'nmkec', 'nmdesa',
])

let _index: Map<string, any[]> | null = null

function loadIndex(): Map<string, any[]> {
  if (_index) return _index
  const file = resolve(process.cwd(), 'public/geo/musirawas_sls-subsls.geojson')
  const raw = readFileSync(file, 'utf-8')
  const geo = JSON.parse(raw) as { features: any[] }
  const idx = new Map<string, any[]>()
  for (const f of geo.features) {
    const p = f.properties ?? {}
    const key = `${p.kdprov ?? ''}${p.kdkab ?? ''}${p.kdkec ?? ''}${p.kddesa ?? ''}`
    if (!idx.has(key)) idx.set(key, [])
    // Strip property: hanya simpan yang dipakai UI
    const cleanProps: Record<string, any> = {}
    for (const k of Object.keys(p)) {
      if (ALLOWED_PROPS.has(k)) cleanProps[k] = p[k]
    }
    idx.get(key)!.push({ type: f.type, properties: cleanProps, geometry: f.geometry })
  }
  _index = idx
  return idx
}

function buildGeoJson(iddesa: string) {
  const idx = loadIndex()
  const features = idx.get(iddesa) ?? []
  return { type: 'FeatureCollection' as const, features }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const iddesa = url.searchParams.get('desa') ?? ''
  const skala = url.searchParams.get('skala')
  const includeGeo = url.searchParams.get('geojson') === '1'
  const skalaFilter = skala && ['UMK', 'UM', 'UB'].includes(skala) ? skala : null

  // Validasi: iddesa = 10 digit numeric
  if (!/^\d{10}$/.test(iddesa)) {
    return NextResponse.json({ error: 'Param `desa` harus 10 digit numeric (iddesa)' }, { status: 400 })
  }

  const pctF = (a: number, t: number) => t > 0 ? Math.round((a / t) * 1000) / 10 : 0

  try {
    // ---- Sumber utama: fasih_sls ----
    const [fasihRows] = await pool.execute(
      `SELECT kode_sls, total, open, draft, submitted_pencacah, submitted_responden,
              approved, rejected, revoked, edited_pengawas, completed_admin, edited_admin,
              selesai_cacah, selesai_approve
       FROM fasih_sls WHERE kode_desa = ? ORDER BY selesai_cacah DESC`,
      [iddesa],
    ) as [any[], any]

    if (fasihRows.length > 0) {
      // nama SLS dari fasih_subsls (Fasih) atau geojson
      const [nmRows] = await pool.execute(
        `SELECT kode_sls, MAX(nama_sls) AS nm FROM fasih_subsls WHERE kode_desa = ? GROUP BY kode_sls`, [iddesa],
      ) as [any[], any]
      const nmMap = new Map<string, string>()
      for (const r of nmRows) if (r.nm) nmMap.set(String(r.kode_sls), r.nm)

      const data = fasihRows.map((r: any) => {
        const total = Number(r.total), cacah = Number(r.selesai_cacah), approve = Number(r.selesai_approve)
        const kode = String(r.kode_sls)
        return {
          idsls: kode,
          kdsls: kode.slice(-4),
          nmsls: nmMap.get(kode) ?? '',
          target_usaha: total,
          realisasi: cacah,
          persentase: pctF(cacah, total),
          breakdown: null,
          fasih: {
            open: Number(r.open), draft: Number(r.draft), submitted: Number(r.submitted_pencacah),
            submitted_responden: Number(r.submitted_responden),
            approved: Number(r.approved), rejected: Number(r.rejected), revoked: Number(r.revoked),
            completed_admin: Number(r.completed_admin), edited_admin: Number(r.edited_admin),
            edited_pengawas: Number(r.edited_pengawas),
            selesai_cacah: cacah, pct_cacah: pctF(cacah, total),
            selesai_approve: approve, pct_approve: pctF(approve, total),
          },
        }
      })
      const body: any = { data, source: 'fasih' }
      if (includeGeo) body.geojson = buildGeoJson(iddesa)
      return NextResponse.json(body, {
        headers: { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=20' },
      })
    }

    // ---- Fallback: agregasi usaha ----
    // Filter tahan format kddesa: 10-digit (kddesa = iddesa) atau 3-digit (kdkec+kddesa).
    const params: any[] = [iddesa, iddesa]
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
      WHERE (kddesa = ? OR CONCAT(kdkec, kddesa) = ?)
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
      // Normalisasi kdsls supaya konsisten dengan geojson (4-digit zero-padded).
      // - Kalau kdsls panjang >= 14 → diasumsikan composed idsls, ambil 4 digit terakhir.
      // - Kalau panjang < 4 → padStart('0').
      const rawKdsls = String(r.kdsls ?? '')
      const kdslsLocal = rawKdsls.length >= 14 ? rawKdsls.slice(-4) : rawKdsls.padStart(4, '0')
      // Semua row di query ini milik 1 desa → idsls = iddesa(10) + kdsls(4) = 14 digit (cocok geojson).
      const idsls = `${iddesa}${kdslsLocal}`
      return {
        idsls,
        kdsls: kdslsLocal,
        kdslsRaw: rawKdsls,
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

    const body: any = { data }
    if (includeGeo) body.geojson = buildGeoJson(iddesa)

    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=60',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e?.message ?? 'DB error' }, { status: 500 })
  }
}
