import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export async function GET() {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const [rows] = await pool.execute(
    `SELECT b.*, u.nama AS imported_by_name
     FROM tagging_import_batch b LEFT JOIN users u ON u.id=b.imported_by
     ORDER BY b.id DESC LIMIT 20`,
  )
  return NextResponse.json({ data: rows })
}
