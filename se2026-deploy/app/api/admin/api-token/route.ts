/**
 * GET  /api/admin/api-token        — list tokens (hashes hidden, hanya prefix)
 * POST /api/admin/api-token        — create token; plaintext dikembalikan SEKALI di response
 *
 * Hardcoded: sensus_kode='se', tahun=2026 untuk SE2026 admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { generateToken } from '@/lib/api-guard'

const SENSUS = 'se'
const TAHUN = 2026

export async function GET() {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  try {
    const [rows] = await pool.execute(
      `SELECT id, label, prefix, sensus_kode, tahun, scopes, expires_at, last_used_at, revoked_at, created_at
       FROM api_token
       WHERE sensus_kode = ? AND tahun = ?
       ORDER BY created_at DESC`,
      [SENSUS, TAHUN],
    ) as [any[], any]
    return NextResponse.json({ data: rows.map(r => ({ ...r, scopes: typeof r.scopes === 'string' ? JSON.parse(r.scopes) : r.scopes })) })
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const label: string = (body.label ?? '').trim()
  const scopes: string[] = Array.isArray(body.scopes) ? body.scopes : []
  const expiresAt: string | null = body.expires_at ?? null

  if (!label) return NextResponse.json({ error: 'Label wajib' }, { status: 400 })
  if (scopes.length === 0) return NextResponse.json({ error: 'Minimal 1 scope' }, { status: 400 })

  const { plaintext, hash, prefix } = generateToken(SENSUS, TAHUN)
  try {
    const [res] = await pool.execute(
      `INSERT INTO api_token (label, token_hash, prefix, sensus_kode, tahun, scopes, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [label, hash, prefix, SENSUS, TAHUN, JSON.stringify(scopes), Number(guard.id), expiresAt],
    ) as [any, any]
    return NextResponse.json({
      id: res.insertId,
      label, prefix,
      token: plaintext,  // ⚠️ DIKIRIM SEKALI — client harus copy
      scopes,
      expires_at: expiresAt,
      message: 'Token ini hanya ditampilkan sekali. Simpan di tempat aman.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
