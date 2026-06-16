/**
 * POST /api/se/2026/external/fasih
 *
 * Ingest progress hasil scraper Fasih (agregat per wilayah & petugas) via Bearer token.
 * Body JSON (semua level opsional, kirim yang berubah saja):
 *   { snapshot_ts?, kecamatan?[], desa?[], sls?[], subsls?[], petugas?[], pengawas?[] }
 *
 * Idempotent: upsert by PK tiap level. Sensus context hardcoded dari path (se/2026).
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireApiToken, checkRateLimit, logAudit } from '@/lib/api-guard'
import { ingestFasih, type FasihPayload } from '@/lib/fasih/ingest'

const SENSUS = 'se'
const TAHUN = 2026
const MAX_ROWS = 6000

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const tok = await requireApiToken(req, SENSUS, TAHUN, 'write:progress')
  if (tok instanceof NextResponse) return tok

  const rate = checkRateLimit(`tok_${tok.id}`)
  if (!rate.ok) {
    await logAudit({ tokenId: tok.id, sensus: SENSUS, tahun: TAHUN, method: 'POST', path: req.nextUrl.pathname, status: 429, req })
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'X-RateLimit-Reset': String(rate.resetAt) } })
  }

  let body: FasihPayload
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const levels = ['kecamatan', 'desa', 'sls', 'subsls', 'petugas', 'pengawas'] as const
  const totalRows = levels.reduce((a, l) => a + (Array.isArray((body as any)[l]) ? (body as any)[l].length : 0), 0)
  if (totalRows === 0) {
    return NextResponse.json({ error: 'Body harus berisi minimal satu level (kecamatan/desa/sls/subsls/petugas/pengawas) non-kosong' }, { status: 400 })
  }
  if (totalRows > MAX_ROWS) {
    return NextResponse.json({ error: `Maksimal ${MAX_ROWS} baris per request (diterima ${totalRows}). Pecah per level.` }, { status: 413 })
  }

  try {
    const result = await ingestFasih(pool, body, { source: 'json', token_id: tok.id })
    await logAudit({ tokenId: tok.id, sensus: SENSUS, tahun: TAHUN, method: 'POST', path: req.nextUrl.pathname, status: 200, req })
    return NextResponse.json({ ok: true, ...result, duration_ms: Date.now() - t0 })
  } catch (e: any) {
    await logAudit({ tokenId: tok.id, sensus: SENSUS, tahun: TAHUN, method: 'POST', path: req.nextUrl.pathname, status: 500, req })
    return NextResponse.json({ error: e?.message ?? 'Ingest gagal' }, { status: 500 })
  }
}
