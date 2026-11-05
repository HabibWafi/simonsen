import mysql from 'mysql2/promise'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

for (const file of ['.env.local', '.env.production', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file)
}
if (!process.env.DB_USER || !process.env.DB_NAME) throw new Error('Set DB_USER dan DB_NAME untuk database tujuan sebelum menjalankan migrasi PES')
const conn = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASS ?? process.env.DB_PASSWORD ?? '', database: process.env.DB_NAME, charset: 'utf8mb4' })
try {
  const sql = readFileSync(resolve('db/migrations/2026_se2026_pes.sql'), 'utf8').split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(s => s.trim()).filter(Boolean)) await conn.query(statement)
  console.log('Migrasi PES selesai: tiga tabel diperiksa; data SE2026 tidak diubah.')
} finally { await conn.end() }
