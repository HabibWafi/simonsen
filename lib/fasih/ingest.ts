/**
 * Core ingest progress Fasih — dipakai bersama oleh:
 *   - endpoint JSON  (app/api/se/2026/external/fasih)
 *   - endpoint Excel (app/api/admin/import/fasih)
 *
 * Upsert by primary key tiap level → idempotent (kirim ulang aman).
 */
import type { Pool, PoolConnection } from 'mysql2/promise'

export type FasihLevel = 'kecamatan' | 'desa' | 'sls' | 'subsls' | 'petugas' | 'pengawas'

export interface FasihPayload {
  snapshot_ts?: string | null
  kecamatan?: any[]
  desa?: any[]
  sls?: any[]
  subsls?: any[]
  petugas?: any[]
  pengawas?: any[]
}

export interface IngestMeta {
  source: 'json' | 'excel'
  token_id?: number | null
}

// Kolom metrik wilayah (urut sesuai INSERT)
const METRIK = [
  'total', 'open', 'draft', 'submitted_pencacah', 'submitted_responden',
  'approved', 'rejected', 'revoked', 'selesai_cacah', 'selesai_approve',
  'pct_cacah', 'pct_approve',
] as const

/** Ambil nilai dari row dgn beberapa kemungkinan nama kolom (Fasih header kadang pakai spasi/kapital). */
function pick(row: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k]
  }
  return null
}
const num = (v: any): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const str = (v: any): string | null => (v === undefined || v === null || v === '' ? null : String(v).trim())

/** Normalisasi metrik wilayah dari row (tahan nama kolom Fasih asli maupun snake_case). */
function metrikValues(r: Record<string, any>): number[] {
  return [
    num(pick(r, 'total', 'TOTAL', 'jumlah_unit')),
    num(pick(r, 'open', 'OPEN')),
    num(pick(r, 'draft', 'DRAFT')),
    num(pick(r, 'submitted_pencacah', 'SUBMITTED BY Pencacah', 'submitted_by_pencacah')),
    num(pick(r, 'submitted_responden', 'SUBMITTED RESPONDENT', 'submitted_respondent')),
    num(pick(r, 'approved', 'APPROVED BY Pengawas', 'approved_by_pengawas')),
    num(pick(r, 'rejected', 'REJECTED BY Pengawas', 'rejected_by_pengawas')),
    num(pick(r, 'revoked', 'REVOKED BY Pengawas', 'revoked_by_pengawas')),
    num(pick(r, 'selesai_cacah')),
    num(pick(r, 'selesai_approve')),
    num(pick(r, 'pct_cacah')),
    num(pick(r, 'pct_approve')),
  ]
}

/** Kode "luar wilayah" yang tidak ada di master peta — di-skip untuk rekap wilayah. */
function isOutOfArea(kode: string | null): boolean {
  if (!kode) return true
  return /^16050000/.test(kode) || kode === '1605000' || kode === '1605000000'
}

function onDupClause(cols: string[]): string {
  return cols.filter(c => c !== undefined).map(c => `${c}=VALUES(${c})`).join(', ')
}

async function chunkedUpsert(
  conn: PoolConnection,
  table: string,
  cols: string[],
  rows: any[][],
  updateCols: string[],
): Promise<number> {
  if (rows.length === 0) return 0
  const placeholders = `(${cols.map(() => '?').join(', ')})`
  let total = 0
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const sql =
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${chunk.map(() => placeholders).join(', ')} ` +
      `ON DUPLICATE KEY UPDATE ${onDupClause(updateCols)}`
    const flat = chunk.flat()
    const [res] = await conn.query(sql, flat) as [any, any]
    total += chunk.length
    void res
  }
  return total
}

export async function ingestFasih(
  pool: Pool,
  payload: FasihPayload,
  meta: IngestMeta,
): Promise<{ snapshot_id: number; counts: Record<string, number> }> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // 1. snapshot meta
    const rowsTotal =
      (payload.kecamatan?.length ?? 0) + (payload.desa?.length ?? 0) + (payload.sls?.length ?? 0) +
      (payload.subsls?.length ?? 0) + (payload.petugas?.length ?? 0) + (payload.pengawas?.length ?? 0)
    const [snapRes] = await conn.execute(
      `INSERT INTO fasih_snapshot (snapshot_ts, source, token_id, rows_total) VALUES (?, ?, ?, ?)`,
      [payload.snapshot_ts ?? null, meta.source, meta.token_id ?? null, rowsTotal],
    ) as [any, any]
    const snapshotId = snapRes.insertId
    const counts: Record<string, number> = {}

    // 2. Kecamatan
    if (Array.isArray(payload.kecamatan)) {
      const cols = ['kode_kec', ...METRIK, 'snapshot_id']
      const rows = payload.kecamatan
        .map(r => ({ kode: str(pick(r, 'kode_kec', 'KODE_KEC')), r }))
        .filter(x => x.kode && !isOutOfArea(x.kode))
        .map(x => [x.kode, ...metrikValues(x.r), snapshotId])
      counts.kecamatan = await chunkedUpsert(conn, 'fasih_kec', cols, rows, [...METRIK, 'snapshot_id'])
    }

    // 3. Desa
    if (Array.isArray(payload.desa)) {
      const cols = ['kode_desa', 'kode_kec', ...METRIK, 'snapshot_id']
      const rows = payload.desa
        .map(r => ({ kd: str(pick(r, 'kode_desa', 'KODE_DESA')), kk: str(pick(r, 'kode_kec', 'KODE_KEC')), r }))
        .filter(x => x.kd && !isOutOfArea(x.kd))
        .map(x => [x.kd, x.kk ?? x.kd!.slice(0, 7), ...metrikValues(x.r), snapshotId])
      counts.desa = await chunkedUpsert(conn, 'fasih_desa', cols, rows, ['kode_kec', ...METRIK, 'snapshot_id'])
    }

    // 4. SLS
    if (Array.isArray(payload.sls)) {
      const cols = ['kode_sls', 'kode_kec', 'kode_desa', ...METRIK, 'snapshot_id']
      const rows = payload.sls
        .map(r => ({
          ks: str(pick(r, 'kode_sls', 'KODE_SLS')),
          kk: str(pick(r, 'kode_kec', 'KODE_KEC')),
          kd: str(pick(r, 'kode_desa', 'KODE_DESA')),
          r,
        }))
        .filter(x => x.ks && !isOutOfArea(x.ks))
        .map(x => [x.ks, x.kk ?? x.ks!.slice(0, 7), x.kd ?? x.ks!.slice(0, 10), ...metrikValues(x.r), snapshotId])
      counts.sls = await chunkedUpsert(conn, 'fasih_sls', cols, rows, ['kode_kec', 'kode_desa', ...METRIK, 'snapshot_id'])
    }

    // 5. SUBSLS (granular + petugas)
    if (Array.isArray(payload.subsls)) {
      const cols = [
        'kode_terkecil', 'kode_kec', 'kode_desa', 'kode_sls', 'nama_desa', 'nama_sls',
        'level_terkecil', 'kode_unit16', 'pencacah', 'nama_ppl', 'pengawas', 'nama_pml',
        ...METRIK, 'snapshot_id',
      ]
      const rows = payload.subsls
        .map(r => ({ kt: str(pick(r, 'kode_terkecil', 'kode_unit16', 'kode_sls')), r }))
        .filter(x => x.kt && !isOutOfArea(x.kt))
        .map(x => {
          const r = x.r
          return [
            x.kt,
            str(pick(r, 'kode_kec', 'KODE_KEC')) ?? x.kt!.slice(0, 7),
            str(pick(r, 'kode_desa', 'KODE_DESA')) ?? x.kt!.slice(0, 10),
            str(pick(r, 'kode_sls', 'KODE_SLS')),
            str(pick(r, 'nama_desa')), str(pick(r, 'nama_sls')),
            str(pick(r, 'level_terkecil')), str(pick(r, 'kode_unit16')),
            str(pick(r, 'pencacah')), str(pick(r, 'nama_ppl')),
            str(pick(r, 'pengawas')), str(pick(r, 'nama_pml')),
            ...metrikValues(r), snapshotId,
          ]
        })
      counts.subsls = await chunkedUpsert(conn, 'fasih_subsls', cols, rows, cols.slice(1))
    }

    // 6. Petugas (per pencacah)
    if (Array.isArray(payload.petugas)) {
      const cols = ['pencacah', 'nama_ppl', 'nama_pml', 'jumlah_unit', 'target', ...METRIK.slice(1), 'snapshot_id']
      const rows = payload.petugas
        .map(r => ({ p: str(pick(r, 'pencacah', 'email_ppl')), r }))
        .filter(x => x.p)
        .map(x => {
          const r = x.r
          const m = metrikValues(r) // index0 = total (jumlah_unit), kita pakai jumlah_unit/target eksplisit
          return [
            x.p, str(pick(r, 'nama_ppl')), str(pick(r, 'nama_pml')),
            num(pick(r, 'jumlah_unit', 'total')), num(pick(r, 'target')),
            ...m.slice(1), // open..pct_approve (tanpa total)
            snapshotId,
          ]
        })
      counts.petugas = await chunkedUpsert(conn, 'fasih_petugas', cols, rows, cols.slice(1))
    }

    // 7. Pengawas (per PML)
    if (Array.isArray(payload.pengawas)) {
      const cols = ['pengawas', 'nama_pml', 'jumlah_ppl', 'jumlah_unit', 'target', 'selesai_cacah', 'selesai_approve', 'pct_cacah', 'pct_approve', 'snapshot_id']
      const rows = payload.pengawas
        .map(r => ({ p: str(pick(r, 'pengawas', 'email_pml')), r }))
        .filter(x => x.p)
        .map(x => {
          const r = x.r
          return [
            x.p, str(pick(r, 'nama_pml')),
            num(pick(r, 'jumlah_ppl')), num(pick(r, 'jumlah_unit', 'total')), num(pick(r, 'target')),
            num(pick(r, 'selesai_cacah')), num(pick(r, 'selesai_approve')),
            num(pick(r, 'pct_cacah')), num(pick(r, 'pct_approve')),
            snapshotId,
          ]
        })
      counts.pengawas = await chunkedUpsert(conn, 'fasih_pengawas', cols, rows, cols.slice(1))
    }

    // 8. Snapshot cumulative HARIAN per (pencacah, kode_kec) untuk tanggal WIB hari ini.
    //    Dipanggil jika subsls ter-update (sumber petugas↔wilayah). Cron-free:
    //    baris hari ini selalu di-refresh ke cumulative terbaru → delta vs hari
    //    sebelumnya = progress harian.
    if (Array.isArray(payload.subsls) && payload.subsls.length > 0) {
      const tglWib = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date()) // YYYY-MM-DD
      await conn.execute(
        `INSERT INTO fasih_petugas_harian (tanggal, pencacah, kode_kec, nama_ppl, nama_pml, total, cum_cacah, cum_approve)
         SELECT ?, pencacah, kode_kec, MAX(nama_ppl), MAX(nama_pml),
                SUM(total), SUM(selesai_cacah), SUM(selesai_approve)
         FROM fasih_subsls
         WHERE pencacah IS NOT NULL AND pencacah <> ''
         GROUP BY pencacah, kode_kec
         ON DUPLICATE KEY UPDATE
           nama_ppl = VALUES(nama_ppl), nama_pml = VALUES(nama_pml),
           total = VALUES(total), cum_cacah = VALUES(cum_cacah), cum_approve = VALUES(cum_approve)`,
        [tglWib],
      )
    }

    await conn.execute(`UPDATE fasih_snapshot SET rows_total = ? WHERE id = ?`,
      [Object.values(counts).reduce((a, b) => a + b, 0), snapshotId])

    await conn.commit()
    return { snapshot_id: snapshotId, counts }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
