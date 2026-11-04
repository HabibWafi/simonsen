import { NextResponse } from 'next/server'
import { auth } from './auth'
import pool from './db'
import type { Role, SessionUser } from '@/types'

/**
 * Helper for API route handlers. Returns session user if authorized,
 * or NextResponse with 401/403 if not.
 *
 * Usage:
 *   const guard = await requireRole(['admin'])
 *   if (guard instanceof NextResponse) return guard
 *   // guard is SessionUser
 */
export async function requireRole(allowed: Role[] | 'auth', req?: Request): Promise<SessionUser | NextResponse> {
  if (req && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const expectedOrigin = new URL(process.env.NEXTAUTH_URL ?? req.url).origin
    if (req.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expectedOrigin)) {
      return NextResponse.json({ error: 'Origin tidak diizinkan' }, { status: 403 })
    }
  }
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (allowed !== 'auth' && !allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return user
}

/** Server Component helper. Returns user atau null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  const id = (session?.user as unknown as SessionUser | undefined)?.id
  if (!id || !/^\d+$/.test(id)) return null
  // JWTs live for 30 days; privilege changes and deleted accounts must take effect now.
  const [rows] = await pool.execute(
    'SELECT id, nip, nama, role, kecamatan, kdkec FROM users WHERE id = ? LIMIT 1', [id],
  ) as [Array<{ id: number; nip: string; nama: string; role: Role; kecamatan?: string; kdkec?: string }>, unknown]
  const user = rows[0]
  if (!user || !['admin', 'koordinator', 'petugas'].includes(user.role)) return null
  return { id: String(user.id), name: user.nama, email: user.nip, role: user.role, kecamatan: user.kecamatan, kdkec: user.kdkec }
}
