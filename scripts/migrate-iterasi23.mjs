/** Apply Iterasi 23 (tagging) ke database yang dipilih lewat env. */
import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

for (const file of ['.env.local', '.env.production']) {
  try {
    for (const line of readFileSync(resolve(file), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
      if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch {}
}

const sql = readFileSync(resolve('db/migrations/2026_se2026_iterasi23.sql'), 'utf8')
const statements = sql
  .split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  .split(/;\s*(?:\r?\n|$)/).map(s => s.trim()).filter(Boolean)

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
})

try {
  for (const statement of statements) await conn.query(statement)
  console.log(`✓ Migrasi tagging iterasi23 siap (${statements.length} tabel diperiksa).`)
} finally {
  await conn.end()
}
