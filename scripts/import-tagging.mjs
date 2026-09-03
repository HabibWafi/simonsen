/**
 * Import snapshot tagging langsung dari Excel ke database.
 * Usage: node scripts/import-tagging.mjs <path.xlsx>
 * Kredensial hanya dibaca dari env/.env lokal dan tidak pernah dicetak.
 */
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import mysql from 'mysql2/promise'
import * as XLSX from 'xlsx'
import { finalizeTaggingBatch } from '../lib/tagging/finalize.mjs'

for (const file of ['.env.local', '.env.production']) {
  try {
    for (const line of readFileSync(resolve(file), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
      if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch {}
}

const inputPath = process.argv[2] ? resolve(process.argv[2]) : null
if (!inputPath || !/\.xlsx$/i.test(inputPath)) {
  console.error('Usage: node scripts/import-tagging.mjs <path.xlsx>')
  process.exit(1)
}

const required = [
  'assignment_id', 'assignment_status_alias', 'level_6_full_code', 'nama_usaha_bang', 'nama_kk',
  'ada_keluarga_label', 'ada_bang_usaha_label', 'geotag_accuracy', 'geotag_latitude', 'geotag_longitude',
]
const fileBuffer = readFileSync(inputPath)
const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
const sheet = workbook.Sheets.Sheet2
if (!sheet) throw new Error('Sheet2 tidak ditemukan')
const sourceRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })
if (!sourceRows.length) throw new Error('Sheet2 kosong')
const missing = required.filter(column => !Object.hasOwn(sourceRows[0], column))
if (missing.length) throw new Error(`Kolom wajib hilang: ${missing.join(', ')}`)

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  charset: 'utf8mb4', connectionLimit: 4, waitForConnections: true,
})

const nullableText = (value, max) => {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text.slice(0, max) : null
}
const nullableNumber = value => {
  if (value == null || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
const regionCode = value => {
  if (value == null || String(value).trim() === '') return null
  const number = Number(value)
  if (Number.isSafeInteger(number)) return String(number)
  const text = String(value).trim()
  return /^\d+$/.test(text) ? text : null
}
const fileHash = createHash('sha256').update(fileBuffer).digest('hex')
const filename = inputPath.split(/[\\/]/).pop()

try {
  const [users] = await pool.execute(`SELECT id FROM users WHERE nip='admin' LIMIT 1`)
  if (!users[0]) throw new Error('Akun admin belum tersedia')
  const [existing] = await pool.execute(
    `SELECT id FROM tagging_import_batch WHERE file_sha256=? AND status='completed' LIMIT 1`, [fileHash],
  )
  if (existing[0]) {
    console.log(`✓ File ini sudah aktif/tersimpan pada batch #${existing[0].id}; import dilewati.`)
    process.exitCode = 0
  } else {
    const [batchResult] = await pool.execute(
      `INSERT INTO tagging_import_batch (filename,file_sha256,file_size,raw_rows,imported_by)
       VALUES (?,?,?,?,?)`,
      [filename, fileHash, statSync(inputPath).size, sourceRows.length, users[0].id],
    )
    const batchId = batchResult.insertId
    const columns = [
      'batch_id','source_row','assignment_id','assignment_status_alias','level_6_full_code',
      'nama_usaha_bang','nama_kk','ada_keluarga_label','ada_bang_usaha_label',
      'geotag_accuracy','geotag_latitude','geotag_longitude','row_hash',
    ]
    for (let start = 0; start < sourceRows.length; start += 500) {
      const chunk = sourceRows.slice(start, start + 500).map((source, offset) => {
        const row = {
          batch_id: batchId, source_row: start + offset + 2,
          assignment_id: nullableText(source.assignment_id, 64),
          assignment_status_alias: nullableText(source.assignment_status_alias, 100),
          level_6_full_code: regionCode(source.level_6_full_code),
          nama_usaha_bang: nullableText(source.nama_usaha_bang, 255),
          nama_kk: nullableText(source.nama_kk, 255),
          ada_keluarga_label: nullableText(source.ada_keluarga_label, 80),
          ada_bang_usaha_label: nullableText(source.ada_bang_usaha_label, 80),
          geotag_accuracy: nullableNumber(source.geotag_accuracy),
          geotag_latitude: nullableNumber(source.geotag_latitude),
          geotag_longitude: nullableNumber(source.geotag_longitude),
          row_hash: '',
        }
        if (!row.assignment_id || !row.assignment_status_alias || !row.level_6_full_code) {
          throw new Error(`Kolom wajib kosong pada baris ${row.source_row}`)
        }
        row.row_hash = createHash('sha256').update(JSON.stringify([
          row.assignment_id,row.assignment_status_alias,row.level_6_full_code,row.nama_usaha_bang,row.nama_kk,
          row.ada_keluarga_label,row.ada_bang_usaha_label,row.geotag_accuracy,row.geotag_latitude,row.geotag_longitude,
        ])).digest('hex')
        return row
      })
      const placeholders = chunk.map(() => `(${columns.map(() => '?').join(',')})`).join(',')
      const values = chunk.flatMap(row => columns.map(column => row[column] ?? null))
      await pool.query(`INSERT INTO tagging_import_stage (${columns.join(',')}) VALUES ${placeholders}`, values)
      const uploaded = Math.min(start + chunk.length, sourceRows.length)
      if (uploaded % 10000 < 500 || uploaded === sourceRows.length) console.log(`  staging ${uploaded}/${sourceRows.length}`)
    }
    await pool.execute(`UPDATE tagging_import_batch SET uploaded_rows=? WHERE id=?`, [sourceRows.length, batchId])
    console.log('  finalisasi geospasial & deteksi duplikasi…')
    const result = await finalizeTaggingBatch(pool, batchId)
    console.log(`✓ Snapshot tagging aktif: batch #${batchId}`)
    console.log(JSON.stringify(result, null, 2))
  }
} catch (error) {
  console.error(`✗ Import tagging gagal: ${error.message}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
