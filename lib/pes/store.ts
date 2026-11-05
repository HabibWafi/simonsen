import { createHash, randomUUID } from 'node:crypto'
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { buildPesHistory, countFields, dateWib, percent, summarizePes, type PesPayload, type PesPetugas, type PesHistoryRow, type PesResponse } from './domain'

export class PesConflict extends Error {}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export async function ingestPes(pool: Pool, payload: PesPayload, tokenId: number) {
  const rows = [...payload.petugas].sort((a, b) => a.pencacah < b.pencacah ? -1 : a.pencacah > b.pencacah ? 1 : 0)
  const observedMs = Date.parse(payload.snapshot_ts)
  const sqlTime = payload.snapshot_ts.replace('T', ' ').replace('Z', '')
  const day = dateWib(observedMs)
  const payloadHash = hash({ snapshot_ts: payload.snapshot_ts, petugas: rows })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [insert] = await conn.execute<ResultSetHeader>(
      'INSERT IGNORE INTO pes_snapshot (payload_hash, observed_at, token_id, rows_total, received_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))',
      [payloadHash, sqlTime, tokenId, rows.length],
    )
    if (!insert.affectedRows) {
      const [existing] = await conn.execute<RowDataPacket[]>('SELECT id FROM pes_snapshot WHERE payload_hash = ?', [payloadHash])
      await conn.commit()
      return { snapshot_id: Number(existing[0].id), duplicate: true, updated: 0 }
    }
    let updated = 0
    for (const row of rows) {
      await conn.execute('INSERT IGNORE INTO pes_petugas (id, source_key) VALUES (?, ?)', [randomUUID(), row.pencacah])
      const [locked] = await conn.execute<RowDataPacket[]>('SELECT id, observed_ms, row_hash FROM pes_petugas WHERE source_key = ? FOR UPDATE', [row.pencacah])
      const previous = locked[0]
      const rowHash = hash(row)
      if (previous.observed_ms !== null) {
        if (Number(previous.observed_ms) > observedMs) throw new PesConflict('Snapshot lebih lama dari kondisi petugas terkini')
        if (Number(previous.observed_ms) === observedMs) {
          if (previous.row_hash !== rowHash) throw new PesConflict('Waktu snapshot sama berisi angka berbeda; gunakan waktu sumber yang baru')
          continue
        }
      }
      await conn.execute(
        `UPDATE pes_petugas SET nama_ppl = ?, nama_pml = ?, ${countFields.map(f => `\`${f}\` = ?`).join(', ')}, observed_at = ?, observed_ms = ?, row_hash = ?, snapshot_id = ? WHERE id = ?`,
        [row.nama_ppl, row.nama_pml, ...countFields.map(f => row[f]), sqlTime, observedMs, rowHash, insert.insertId, previous.id],
      )
      await conn.execute(
        `INSERT INTO pes_petugas_harian (petugas_id, tanggal, total, selesai_cacah, selesai_approve, observed_at) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE total = VALUES(total), selesai_cacah = VALUES(selesai_cacah), selesai_approve = VALUES(selesai_approve), observed_at = VALUES(observed_at)`,
        [previous.id, day, row.total, row.selesai_cacah, row.selesai_approve, sqlTime],
      )
      updated++
    }
    await conn.commit()
    return { snapshot_id: insert.insertId, duplicate: false, updated }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally { conn.release() }
}

export async function readPes(pool: Pool, range: { from: string; to: string }, filters: { q?: string; pengawas?: string; petugas?: string } = {}): Promise<PesResponse> {
  const conn = await pool.getConnection()
  try {
    await conn.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await conn.beginTransaction()
    // Explicit public fields: never SELECT source_key, row_hash or token metadata.
    const [raw] = await conn.execute<RowDataPacket[]>(`SELECT id, nama_ppl, nama_pml, ${countFields.map(f => `\`${f}\``).join(', ')}, DATE_FORMAT(observed_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS observed_at FROM pes_petugas WHERE observed_at IS NOT NULL ORDER BY nama_ppl, id`)
    const all = raw.map(row => {
      const counts = Object.fromEntries(countFields.map(f => [f, Number(row[f])])) as Pick<PesPetugas, typeof countFields[number]>
      return { id: String(row.id), nama_ppl: String(row.nama_ppl), nama_pml: String(row.nama_pml), observed_at: String(row.observed_at), ...counts, pct_cacah: percent(counts.selesai_cacah, counts.total), pct_approve: percent(counts.selesai_approve, counts.total) }
    })
    const q = filters.q?.trim().toLocaleLowerCase('id-ID') || ''
    const petugas = all.filter(row => (!q || row.nama_ppl.toLocaleLowerCase('id-ID').includes(q)) && (!filters.pengawas || row.nama_pml === filters.pengawas) && (!filters.petugas || row.id === filters.petugas))
    let historyRows: PesHistoryRow[] = []
    if (petugas.length) {
      const ids = petugas.map(row => row.id)
      const marks = ids.map(() => '?').join(',')
      const columns = "h.petugas_id, DATE_FORMAT(h.tanggal, '%Y-%m-%d') AS tanggal, h.total, h.selesai_cacah, h.selesai_approve"
      const [history] = await conn.execute<RowDataPacket[]>(`SELECT ${columns} FROM pes_petugas_harian h WHERE h.petugas_id IN (${marks}) AND h.tanggal BETWEEN ? AND ?`, [...ids, range.from, range.to])
      const [baseline] = await conn.execute<RowDataPacket[]>(`SELECT ${columns} FROM pes_petugas_harian h INNER JOIN (SELECT petugas_id, MAX(tanggal) AS tanggal FROM pes_petugas_harian WHERE petugas_id IN (${marks}) AND tanggal < ? GROUP BY petugas_id) b ON b.petugas_id = h.petugas_id AND b.tanggal = h.tanggal`, [...ids, range.from])
      historyRows = [...baseline, ...history].map(row => ({ petugas_id: String(row.petugas_id), tanggal: String(row.tanggal), total: Number(row.total), selesai_cacah: Number(row.selesai_cacah), selesai_approve: Number(row.selesai_approve) }))
    }
    await conn.commit()
    return { petugas, options: all.map(row => ({ id: row.id, nama_ppl: row.nama_ppl, nama_pml: row.nama_pml })), summary: summarizePes(petugas), range, history: buildPesHistory(historyRows, range.from, range.to), latest_source_at: petugas.reduce<string | null>((latest, row) => !latest || row.observed_at > latest ? row.observed_at : latest, null) }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally { conn.release() }
}
