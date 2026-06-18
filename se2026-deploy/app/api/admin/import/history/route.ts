import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export async function GET() {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard
  try {
    const [rows] = await pool.execute(
      `SELECT b.id, b.jenis, b.filename, b.total_rows, b.inserted_rows, b.updated_rows,
              b.duplicate_rows, b.error_rows, b.imported_at,
              b.status, b.revoked_at,
              u.nama AS imported_by_name
       FROM import_batch b
       LEFT JOIN users u ON u.id = b.imported_by
       ORDER BY b.imported_at DESC
       LIMIT 50`,
    ) as [any[], any]
    return NextResponse.json({ data: rows })
  } catch (e: any) {
    // Fallback kalau kolom status belum ada (pre-migrate iterasi 7)
    try {
      const [rows] = await pool.execute(
        `SELECT b.id, b.jenis, b.filename, b.total_rows, b.inserted_rows, b.updated_rows,
                b.duplicate_rows, b.error_rows, b.imported_at,
                'completed' AS status, NULL AS revoked_at,
                u.nama AS imported_by_name
         FROM import_batch b
         LEFT JOIN users u ON u.id = b.imported_by
         ORDER BY b.imported_at DESC LIMIT 50`,
      ) as [any[], any]
      return NextResponse.json({ data: rows })
    } catch (e2: any) {
      return NextResponse.json({ data: [], error: e2.message }, { status: 500 })
    }
  }
}
