/**
 * Helper guard untuk External API per-sensus.
 *
 * Token disimpan sebagai SHA-256 hash di api_token.token_hash.
 * Plaintext token format: "<kode><tahun>_<prefix>_<random32>"
 * Saat verify, hash incoming token → lookup hash di DB.
 *
 * Defense-in-depth: token harus match (sensus, tahun) di path URL.
 * Token SE2026 tidak bisa dipakai untuk update SP/ST.
 */
import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import pool from './db'

export interface ApiTokenInfo {
  id: number
  label: string
  sensus_kode: string
  tahun: number
  scopes: string[]
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function generateToken(sensusKode: string, tahun: number): { plaintext: string; hash: string; prefix: string } {
  const randomPart = randomBytes(20).toString('base64url')   // ~27 char
  const prefixPart = randomBytes(3).toString('base64url').slice(0, 4) // 4 char display
  const plaintext = `${sensusKode}${tahun}_${prefixPart}_${randomPart}`
  return { plaintext, hash: sha256(plaintext), prefix: `${sensusKode}${tahun}_${prefixPart}` }
}

function jsonErr(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Verify Bearer token. Return ApiTokenInfo on success or NextResponse (4xx) on fail.
 */
export async function requireApiToken(
  req: NextRequest,
  expectedSensus: string,
  expectedTahun: number,
  requiredScope: string,
): Promise<ApiTokenInfo | NextResponse> {
  const auth = req.headers.get('authorization')
  if (!auth?.toLowerCase().startsWith('bearer ')) {
    return jsonErr('Bearer token wajib di header Authorization', 401)
  }
  const raw = auth.slice(7).trim()
  if (!raw) return jsonErr('Token kosong', 401)

  const hash = sha256(raw)
  try {
    const [rows] = await pool.execute(
      `SELECT id, label, sensus_kode, tahun, scopes, expires_at, revoked_at
       FROM api_token WHERE token_hash = ? LIMIT 1`,
      [hash],
    ) as [any[], any]

    if (!rows.length) {
      await logAudit({ tokenId: null, sensus: expectedSensus, tahun: expectedTahun, method: req.method, path: req.nextUrl.pathname, status: 401, req })
      return jsonErr('Token tidak valid', 401)
    }
    const t = rows[0]
    if (t.revoked_at) return jsonErr('Token sudah di-revoke', 401)
    if (t.expires_at && new Date(t.expires_at) < new Date()) return jsonErr('Token kadaluarsa', 401)

    // 🔒 Defense in depth: sensus harus match path
    if (t.sensus_kode !== expectedSensus || Number(t.tahun) !== expectedTahun) {
      await logAudit({ tokenId: t.id, sensus: expectedSensus, tahun: expectedTahun, method: req.method, path: req.nextUrl.pathname, status: 403, req })
      return jsonErr(`Token tidak punya akses ke ${expectedSensus.toUpperCase()} ${expectedTahun}`, 403)
    }

    const scopes: string[] = typeof t.scopes === 'string' ? JSON.parse(t.scopes) : (t.scopes ?? [])
    if (!hasScope(scopes, requiredScope)) {
      await logAudit({ tokenId: t.id, sensus: expectedSensus, tahun: expectedTahun, method: req.method, path: req.nextUrl.pathname, status: 403, req })
      return jsonErr(`Scope tidak cukup. Diperlukan: ${requiredScope}`, 403)
    }

    // Touch last_used_at (fire-and-forget)
    pool.execute(`UPDATE api_token SET last_used_at = NOW() WHERE id = ?`, [t.id]).catch(() => {})

    return { id: t.id, label: t.label, sensus_kode: t.sensus_kode, tahun: Number(t.tahun), scopes }
  } catch (e: any) {
    console.error('[api-guard] DB error:', e?.message)
    return jsonErr('Internal error', 500)
  }
}

export function hasScope(tokenScopes: string[], required: string): boolean {
  if (tokenScopes.includes(required)) return true
  if (tokenScopes.includes('admin')) return true
  // "read:*" implicitly granted by "write:*" on the same resource
  if (required.startsWith('read:')) {
    const res = required.split(':')[1]
    return tokenScopes.includes(`write:${res}`)
  }
  return false
}

interface AuditInput {
  tokenId: number | null
  sensus: string
  tahun: number
  method: string
  path: string
  status: number
  req: NextRequest
  durationMs?: number
  summary?: any
}

export async function logAudit({ tokenId, sensus, tahun, method, path, status, req, durationMs, summary }: AuditInput) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const ua = req.headers.get('user-agent')?.slice(0, 300) ?? null
    await pool.execute(
      `INSERT INTO api_audit_log (token_id, sensus_kode, tahun, method, path, status, ip, user_agent, request_summary, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tokenId, sensus, tahun, method, path, status, ip, ua, summary ? JSON.stringify(summary) : null, durationMs ?? null],
    )
  } catch { /* ignore */ }
}

/* ── Simple in-memory rate limiter (60 req/min per token) ── */
const RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60         // requests
const RATE_WINDOW = 60 * 1000 // 1 minute

export function checkRateLimit(key: string): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const b = RATE_BUCKETS.get(key)
  if (!b || b.resetAt < now) {
    const fresh = { count: 1, resetAt: now + RATE_WINDOW }
    RATE_BUCKETS.set(key, fresh)
    return { ok: true, remaining: RATE_LIMIT - 1, resetAt: fresh.resetAt }
  }
  if (b.count >= RATE_LIMIT) return { ok: false, remaining: 0, resetAt: b.resetAt }
  b.count++
  return { ok: true, remaining: RATE_LIMIT - b.count, resetAt: b.resetAt }
}
