/**
 * DELETE /api/admin/api-token/[id] — revoke token (soft delete via revoked_at)
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'id tidak valid' }, { status: 400 })
  try {
    await pool.execute(`UPDATE api_token SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL`, [numId])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
