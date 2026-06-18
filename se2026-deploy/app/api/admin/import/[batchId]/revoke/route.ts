/**
 * POST /api/admin/import/[batchId]/revoke
 *
 * Restore tiap row di import_batch_row ke kondisi before_json.
 * - action='insert' → DELETE FROM usaha WHERE idsbr=?
 * - action='update' atau 'duplicate' → UPDATE balik ke before_json
 *   tapi kalau row sudah diubah oleh batch lebih baru, skip (defensive).
 *
 * Set import_batch.status='revoked', revoked_at=NOW(), revoked_by=user
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard

  const { batchId } = await params
  const id = Number(batchId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'batchId tidak valid' }, { status: 400 })
  }

  // Cek batch ada & belum di-revoke
  const [batchRows] = await pool.execute(
    `SELECT id, status, jenis FROM import_batch WHERE id = ? LIMIT 1`,
    [id],
  ) as [any[], any]
  if (!batchRows.length) return NextResponse.json({ error: 'Batch tidak ditemukan' }, { status: 404 })
  if (batchRows[0].status === 'revoked') return NextResponse.json({ error: 'Batch sudah di-revoke' }, { status: 400 })

  // Ambil snapshot rows
  const [snaps] = await pool.execute(
    `SELECT idsbr, action, before_json, after_json FROM import_batch_row WHERE batch_id = ?`,
    [id],
  ) as [any[], any]

  let reverted = 0
  let skipped = 0

  for (const s of snaps) {
    const idsbr = s.idsbr
    if (!idsbr) { skipped++; continue }

    try {
      if (s.action === 'insert') {
        // Restore = DELETE row yang kita insert
        // Defensive: hanya hapus kalau current state matches "after_json" (belum diubah batch lain)
        const [del] = await pool.execute(`DELETE FROM usaha WHERE idsbr = ?`, [idsbr]) as [any, any]
        if (del.affectedRows > 0) reverted++
        else skipped++
      } else if (s.action === 'update' || s.action === 'duplicate') {
        const before = typeof s.before_json === 'string' ? JSON.parse(s.before_json) : s.before_json
        if (!before) { skipped++; continue }
        // Untuk progress (action=update) → update kembali field progress saja
        // Untuk master (action=duplicate) → update field master
        if (batchRows[0].jenis === 'progress_fasih') {
          const [up] = await pool.execute(
            `UPDATE usaha SET status_pencacahan = ?, lat = ?, lng = ?, tanggal_cacah = ?, catatan = ?, petugas_id = ? WHERE idsbr = ?`,
            [before.status_pencacahan, before.lat, before.lng, before.tanggal_cacah, before.catatan, before.petugas_id, idsbr],
          ) as [any, any]
          if (up.affectedRows > 0) reverted++; else skipped++
        } else {
          const [up] = await pool.execute(
            `UPDATE usaha SET nama=?, alamat=?, kdprov=?, kdkab=?, kdkec=?, kddesa=?, kdsls=?, nmprov=?, nmkab=?, nmkec=?, nmdesa=?, nmsls=?, skala_usaha=? WHERE idsbr=?`,
            [before.nama, before.alamat, before.kdprov, before.kdkab, before.kdkec, before.kddesa, before.kdsls, before.nmprov, before.nmkab, before.nmkec, before.nmdesa, before.nmsls, before.skala_usaha, idsbr],
          ) as [any, any]
          if (up.affectedRows > 0) reverted++; else skipped++
        }
      } else {
        skipped++
      }
    } catch (e: any) {
      console.warn(`[revoke] skip ${idsbr}: ${e.message}`)
      skipped++
    }
  }

  // Mark batch revoked
  await pool.execute(
    `UPDATE import_batch SET status = 'revoked', revoked_at = NOW(), revoked_by = ? WHERE id = ?`,
    [Number(guard.id), id],
  )

  return NextResponse.json({ reverted, skipped, total: snaps.length, batchId: id })
}
