import { NextResponse } from 'next/server'
import { auth } from './auth'
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
export async function requireRole(allowed: Role[] | 'auth'): Promise<SessionUser | NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = session.user as unknown as SessionUser
  if (allowed !== 'auth' && !allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return user
}

/** Server Component helper. Returns user atau null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  return (session?.user as unknown as SessionUser) ?? null
}
