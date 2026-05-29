/**
 * All-in-one DB setup untuk MySQL Laragon.
 * 1. CREATE DATABASE
 * 2. Apply migrations
 * 3. Apply seeds (desa, dummy)
 * 4. Bootstrap admin
 *
 * Idempotent — aman re-run.
 *
 * Run: node scripts/setup-db.mjs
 */
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------- Load .env.local ----------
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const DB_HOST = process.env.DB_HOST ?? 'localhost'
const DB_PORT = Number(process.env.DB_PORT ?? 3306)
const DB_USER = process.env.DB_USER ?? 'root'
const DB_PASS = process.env.DB_PASS ?? ''
const DB_NAME = process.env.DB_NAME ?? 'se2026_bps'

const ADMIN_NIP  = process.env.BOOTSTRAP_ADMIN_NIP  ?? 'admin'
const ADMIN_NAMA = process.env.BOOTSTRAP_ADMIN_NAMA ?? 'Administrator'
const ADMIN_PASS = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'admin123'

function color(c, s) {
  const codes = { green: 32, red: 31, yellow: 33, cyan: 36, dim: 2, bold: 1 }
  return `\x1b[${codes[c] ?? 0}m${s}\x1b[0m`
}
const ok   = (s) => console.log(color('green', '✓'), s)
const info = (s) => console.log(color('cyan',  'ℹ'), s)
const warn = (s) => console.log(color('yellow', '⚠'), s)
const err  = (s) => console.error(color('red',  '✗'), s)

// ---------- Run SQL file as multi-statement ----------
async function runSqlFile(conn, filePath, label) {
  try {
    const sql = readFileSync(resolve(filePath), 'utf-8')
    // Pakai conn.query() — connection diconfigure multipleStatements:true
    await conn.query(sql)
    ok(`${label} applied dari ${filePath}`)
  } catch (e) {
    // MySQL warn about DELIMITER kalau ada di file. Tangani manual untuk procedure.
    err(`Gagal apply ${label}: ${e.message}`)
    throw e
  }
}

// ---------- Execute SQL: strip PROCEDURE blocks (only needed for legacy upgrade) ----------
async function runMigrationFile(conn, filePath) {
  let raw = readFileSync(resolve(filePath), 'utf-8')

  // Strip everything between "DROP PROCEDURE IF EXISTS ..." and the corresponding "DROP PROCEDURE <name>;" (single-statement cleanup).
  // For fresh install, CREATE TABLE IF NOT EXISTS users already includes kdkec column, so procedure block tidak dibutuhkan.
  raw = raw.replace(/DROP PROCEDURE IF EXISTS[\s\S]*?DROP PROCEDURE \w+;/g, '-- (procedure block skipped for fresh install)')

  // Strip line comments
  const cleaned = raw
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n')

  // Split by semicolons at end of line
  const statements = cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const stmt of statements) {
    try {
      await conn.query(stmt)
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_DUP_ENTRY' || e.code === 'ER_DUP_FIELDNAME') {
        continue
      }
      err(`  Statement gagal: ${e.code ?? e.message}`)
      console.error(color('dim', stmt.slice(0, 200) + (stmt.length > 200 ? '…' : '')))
      throw e
    }
  }
  ok(`Migration applied (${statements.length} statement)`)

  // Idempotent: ensure kdkec column exists (for upgrade case dari schema lama)
  try {
    const [cols] = await conn.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'kdkec'`,
    )
    if (!cols.length) {
      await conn.query(`ALTER TABLE users ADD COLUMN kdkec VARCHAR(10) NULL AFTER kecamatan`)
      ok('  + kolom users.kdkec ditambahkan (upgrade)')
    }
  } catch (e) {
    warn(`  Cek kolom kdkec: ${e.message}`)
  }
}

// ---------- Idempotent ALTER untuk iterasi 7 ----------
async function colExists(conn, table, col) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, col],
  )
  return rows.length > 0
}

async function applyIterasi7Alters(conn) {
  // import_batch: status, revoked_at, revoked_by, sensus_kode, tahun
  const alters = [
    ['import_batch', 'status',      `ADD COLUMN status ENUM('completed','revoked') NOT NULL DEFAULT 'completed' AFTER error_summary`],
    ['import_batch', 'revoked_at',  `ADD COLUMN revoked_at TIMESTAMP NULL AFTER status`],
    ['import_batch', 'revoked_by',  `ADD COLUMN revoked_by INT NULL AFTER revoked_at`],
    ['import_batch', 'sensus_kode', `ADD COLUMN sensus_kode VARCHAR(10) NOT NULL DEFAULT 'se' AFTER revoked_by`],
    ['import_batch', 'tahun',       `ADD COLUMN tahun INT NOT NULL DEFAULT 2026 AFTER sensus_kode`],
    ['usaha',        'sensus_kode', `ADD COLUMN sensus_kode VARCHAR(10) NOT NULL DEFAULT 'se' AFTER lng`],
    ['usaha',        'tahun',       `ADD COLUMN tahun INT NOT NULL DEFAULT 2026 AFTER sensus_kode`],
  ]
  for (const [table, col, ddl] of alters) {
    if (!(await colExists(conn, table, col))) {
      try {
        await conn.query(`ALTER TABLE \`${table}\` ${ddl}`)
        ok(`  + ${table}.${col} ditambahkan`)
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') continue
        throw e
      }
    }
  }

  // Composite index untuk filter sensus
  const [idxRows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usaha' AND INDEX_NAME = 'idx_usaha_sensus'`,
  )
  if (!idxRows.length) {
    try {
      await conn.query(`ALTER TABLE usaha ADD INDEX idx_usaha_sensus (sensus_kode, tahun)`)
      ok('  + index idx_usaha_sensus')
    } catch (e) { /* ignore */ }
  }
}

async function migrateExistingAdminAccess(conn) {
  // Setiap user existing → row di user_sensus_access untuk SE 2026 dengan role mereka
  const [users] = await conn.query(`SELECT id, role FROM users`)
  let added = 0
  for (const u of users) {
    const [exists] = await conn.query(
      `SELECT 1 FROM user_sensus_access WHERE user_id = ? AND sensus_kode = 'se' AND tahun = 2026`,
      [u.id],
    )
    if (!exists.length) {
      await conn.execute(
        `INSERT INTO user_sensus_access (user_id, sensus_kode, tahun, role) VALUES (?, 'se', 2026, ?)`,
        [u.id, u.role],
      )
      added++
    }
  }
  if (added > 0) ok(`  + ${added} user di-grant akses SE 2026`)
}

// ---------- Main ----------
async function main() {
  info(`Connect ke MySQL ${DB_USER}@${DB_HOST}:${DB_PORT}…`)
  const root = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS,
    multipleStatements: true,
  })
  ok('Terkoneksi ke MySQL')

  // 1. Create DB
  await root.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  ok(`Database \`${DB_NAME}\` ready`)
  await root.changeUser({ database: DB_NAME })

  // 2. Migration iterasi 4 (base schema)
  info('Apply migration iterasi 4 (base)…')
  await runMigrationFile(root, 'db/migrations/2026_se2026_iterasi4.sql')

  // 3. Seed desa
  info('Apply seed desa…')
  await runSqlFile(root, 'db/seed/desa.sql', '199 desa')

  // 4. Bootstrap admin
  info('Bootstrap admin user…')
  const hashed = await bcrypt.hash(ADMIN_PASS, 10)
  await root.execute(
    `INSERT INTO users (nip, nama, role, password) VALUES (?, ?, 'admin', ?)
     ON DUPLICATE KEY UPDATE nama = VALUES(nama), role = VALUES(role), password = VALUES(password)`,
    [ADMIN_NIP, ADMIN_NAMA, hashed],
  )
  ok(`Admin: nip=${ADMIN_NIP} password=${ADMIN_PASS}`)

  // 5. Seed dummy
  info('Apply dummy data…')
  await runSqlFile(root, 'db/seed/dummy.sql', '12 akses + 80 usaha')

  // 6. Migration iterasi 7 (multi-tenant + import rollback + external API)
  info('Apply migration iterasi 7 (multi-tenant)…')
  await runMigrationFile(root, 'db/migrations/2026_se2026_iterasi7.sql')
  await applyIterasi7Alters(root)
  await migrateExistingAdminAccess(root)

  // 6b. Migration iterasi 9 (posts/sosialisasi + tim_se) + seed
  info('Apply migration iterasi 9 (posts, tim_se)…')
  await runMigrationFile(root, 'db/migrations/2026_se2026_iterasi9.sql')
  try {
    await runSqlFile(root, 'db/seed/iterasi9.sql', 'posts + tim_se')
  } catch (e) { warn(`Seed iterasi9: ${e.message}`) }

  // 7. Verify
  const [[counts]] = await root.query(`
    SELECT
      (SELECT COUNT(*) FROM users)              AS users,
      (SELECT COUNT(*) FROM tahapan)            AS tahapan,
      (SELECT COUNT(*) FROM tahapan_akses)      AS akses,
      (SELECT COUNT(*) FROM desa)               AS desa,
      (SELECT COUNT(*) FROM usaha)              AS usaha,
      (SELECT COUNT(*) FROM import_batch)       AS import_batch,
      (SELECT COUNT(*) FROM sensus_config)      AS sensus_config,
      (SELECT COUNT(*) FROM user_sensus_access) AS user_access,
      (SELECT COUNT(*) FROM api_token)          AS api_token
  `)

  console.log()
  console.log(color('bold', '═══════════════ RINGKASAN ═══════════════'))
  Object.entries(counts).forEach(([k, v]) => {
    console.log(`  ${color('cyan', k.padEnd(15))} ${color('green', String(v).padStart(6))} row`)
  })
  console.log(color('bold', '════════════════════════════════════════'))
  console.log()
  ok(`Setup complete. Login: ${color('bold', `nip=${ADMIN_NIP} password=${ADMIN_PASS}`)}`)

  await root.end()
}

main().catch(e => {
  err(`FATAL: ${e.message}`)
  process.exit(1)
})
