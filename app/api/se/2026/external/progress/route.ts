/**
 * POST /api/se/2026/external/progress
 *
 * External update progress via bearer token.
 * Body: { rows: [{ idsbr, status, tanggal_cacah?, petugas_nip?, catatan?, lat?, lng? }, ...] }
 *
 * Sensus context HARDCODED dari path (se/2026). Token harus match.
 * Tidak ada cara bot SE2026 menyentuh SP/ST.
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireApiToken, checkRateLimit, logAudit } from '@/lib/api-guard'

const SENSUS = 'se'
const TAHUN = 2026

export const runtime = 'nodejs'

const ALLOWED_STATUS = new Set(['belum', 'proses', 'selesai', 'tolak', 'tutup', 'ganda'])

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const tok = await requireApiToken(req, SENSUS, TAHUN, 'write:progress')
  if (tok instanceof NextResponse) return tok

  // Rate limit
  const rate = checkRateLimit(`tok_${tok.id}`)
  if (!rate.ok) {
    await logAudit({ tokenId: tok.id, sensus: SENSUS, tahun: TAHUN, method: 'POST', path: req.nextUrl.pathname, status: 429, req })
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'X-RateLimit-Reset': String(rate.resetAt) } })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const rows = Array.isArray(body?.rows) ? body.rows : null
  if (!rows || rows.length === 0) return NextResponse.json({ error: 'Body harus berisi `rows` array non-kosong' }, { status: 400 })
  if (rows.length > 1000) return NextResponse.json({ error: 'Maksimal 1000 row per request' }, { status: 400 })

  // Buat batch
  const [batchRes] = await pool.execute(
    `INSERT INTO import_batch (jenis, filename, total_rows, imported_by, sensus_kode, tahun)
     VALUES ('progress_fasih', ?, ?, ?, ?, ?)`,
    [`api_token_${tok.id}`, rows.length, 0 /* system user — atau tok.created_by */, SENSUS, TAHUN],
  ) as [any, any]
  const batchId = batchRes.insertId

  let updated = 0
  const errors: any[] = []

  for (const r of rows) {
    if (!r.idsbr || !ALLOWED_STATUS.has(r.status)) {
      errors.push({ idsbr: r.idsbr, message: 'idsbr/status tidak valid' })
      continue
    }
    try {
      const [up] = await pool.execute(
        `UPDATE usaha SET status_pencacahan = ?, lat = COALESCE(?, lat), lng = COALESCE(?, lng),
            tanggal_cacah = COALESCE(?, tanggal_cacah), catatan = COALESCE(?, catatan)
         WHERE idsbr = ?`,
        [r.status, r.lat ?? null, r.lng ?? null, r.tanggal_cacah ?? null, r.catatan ?? null, r.idsbr],
      ) as [any, any]
      if (up.affectedRows > 0) updated++
      else errors.push({ idsbr: r.idsbr, message: 'IDSBR tidak ditemukan' })
    } catch (e: any) {
      errors.push({ idsbr: r.idsbr, message: e.message })
    }
  }

  await pool.execute(
    `UPDATE import_batch SET total_rows = ?, updated_rows = ?, error_rows = ? WHERE id = ?`,
    [rows.length, updated, errors.length, batchId],
  )

  await logAudit({
    tokenId: tok.id, sensus: SENSUS, tahun: TAHUN,
    method: 'POST', path: req.nextUrl.pathname, status: 200, req,
    durationMs: Date.now() - t0,
    summary: { rows: rows.length, updated, errors: errors.length, batchId },
  })

  return NextResponse.json({ batchId, total: rows.length, updated, errors }, {
    headers: {
      'X-RateLimit-Remaining': String(rate.remaining),
      'X-RateLimit-Reset': String(rate.resetAt),
    },
  })
}
