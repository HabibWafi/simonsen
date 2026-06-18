/**
 * Bootstrap admin pertama. Run sekali setelah migrasi.
 *
 * Kredensial dari env:
 *   BOOTSTRAP_ADMIN_NIP, BOOTSTRAP_ADMIN_NAMA, BOOTSTRAP_ADMIN_PASSWORD
 *
 * Run: node scripts/create-admin.mjs
 */
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'

// Load .env.local manual (Node tidak auto-load)
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const nip      = process.env.BOOTSTRAP_ADMIN_NIP      ?? 'admin'
const nama     = process.env.BOOTSTRAP_ADMIN_NAMA     ?? 'Administrator'
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'admin123'

const pool = mysql.createPool({
  host:     process.env.DB_HOST ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 3306),
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
})

const hashed = await bcrypt.hash(password, 10)

try {
  const [result] = await pool.execute(
    `INSERT INTO users (nip, nama, role, password) VALUES (?, ?, 'admin', ?)
     ON DUPLICATE KEY UPDATE nama = VALUES(nama), role = VALUES(role), password = VALUES(password)`,
    [nip, nama, hashed],
  )
  console.log(`✓ Admin bootstrapped: nip=${nip} password=${password}`)
  console.log(`  affectedRows=${result.affectedRows}`)
} catch (e) {
  console.error('✗ Failed:', e.message)
  process.exit(1)
} finally {
  await pool.end()
}
