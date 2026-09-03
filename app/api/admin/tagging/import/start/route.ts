import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const user = await requireRole(['admin'])
  if (user instanceof NextResponse) return user

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const filename = typeof body?.filename === 'string' ? body.filename.trim() : ''
  const fileSha256 = typeof body?.fileSha256 === 'string' ? body.fileSha256.toLowerCase() : ''
  const fileSize = Number(body?.fileSize)
  const rawRows = Number(body?.rawRows)
  if (!/\.xlsx$/i.test(filename) || !/^[a-f0-9]{64}$/.test(fileSha256)
      || !Number.isInteger(rawRows) || rawRows < 1 || rawRows > 500_000
      || !Number.isFinite(fileSize) || fileSize < 1 || fileSize > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Metadata file tagging tidak valid' }, { status: 400 })
  }

  const [existing] = await pool.execute(
    `SELECT id, status FROM tagging_import_batch WHERE file_sha256=? AND status='completed' ORDER BY id DESC LIMIT 1`,
    [fileSha256],
  ) as [Array<{ id: number; status: string }>, unknown]
  if (existing.length) {
    return NextResponse.json({ error: 'File yang sama sudah pernah berhasil diimport', batchId: existing[0].id }, { status: 409 })
  }

  const [result] = await pool.execute(
    `INSERT INTO tagging_import_batch
      (filename, file_sha256, file_size, raw_rows, imported_by)
     VALUES (?, ?, ?, ?, ?)`,
    [filename.slice(0, 255), fileSha256, Math.trunc(fileSize), rawRows, Number(user.id)],
  ) as [{ insertId: number }, unknown]
  return NextResponse.json({ batchId: result.insertId, rawRows }, { status: 201 })
}
