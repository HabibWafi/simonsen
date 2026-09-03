import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { finalizeTaggingBatch } from '@/lib/tagging/finalize.mjs'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const user = await requireRole(['admin'])
  if (user instanceof NextResponse) return user
  const { batchId: rawBatchId } = await params
  const batchId = Number(rawBatchId)
  if (!Number.isInteger(batchId) || batchId < 1) return NextResponse.json({ error: 'Batch tidak valid' }, { status: 400 })
  const [rows] = await pool.execute(
    `SELECT imported_by FROM tagging_import_batch WHERE id=? LIMIT 1`, [batchId],
  ) as [Array<{ imported_by: number }>, unknown]
  if (!rows[0] || Number(rows[0].imported_by) !== Number(user.id)) {
    return NextResponse.json({ error: 'Batch bukan milik sesi ini' }, { status: 403 })
  }
  try {
    const result = await finalizeTaggingBatch(pool, batchId)
    return NextResponse.json({ ok: true, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Finalisasi tagging gagal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
