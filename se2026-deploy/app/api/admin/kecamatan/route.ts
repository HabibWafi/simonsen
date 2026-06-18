import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

/** Daftar kecamatan dari tabel desa (unique kdkec, nmkec). Untuk dropdown form user/usaha. */
export async function GET() {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT kdkec, nmkec FROM desa ORDER BY nmkec ASC`,
    ) as [any[], any]
    return NextResponse.json({ data: rows })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
