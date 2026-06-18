/**
 * Apply Iterasi 16 (tabel fasih_*) ke DB existing.
 * Run: node scripts/migrate-iterasi16.mjs
 */
import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const env = {}
try {
  for (const line of readFileSync(resolve(root, '.env.local'), 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
} catch {}

function splitStatements(sql) {
  return sql
    .split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
    .split(/;\s*(?:\r?\n|$)/).map(s => s.trim()).filter(Boolean)
}

const conn = await mysql.createConnection({
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER || 'root',
  password: env.DB_PASS || '',
  database: env.DB_NAME || 'se2026_bps',
  multipleStatements: true,
})

for (const stmt of splitStatements(readFileSync(resolve(root, 'db/migrations/2026_se2026_iterasi16.sql'), 'utf-8'))) {
  try { await conn.query(stmt) } catch (e) {
    if (!['ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME'].includes(e.code)) throw e
  }
}
console.log('✓ Migration iterasi16 (fasih_*) applied')

const [[c]] = await conn.query(`SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name LIKE 'fasih_%') AS fasih_tables`)
console.log(`✓ ${c.fasih_tables} tabel fasih_* siap`)
await conn.end()
