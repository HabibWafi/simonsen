/**
 * Apply Iterasi 9 ke DB yang sudah ada:
 *  1. Migration 2026_se2026_iterasi9.sql (posts, tim_se)
 *  2. Seed iterasi9.sql (6 posts + 4 tim struktural)
 *  3. Repair usaha.kdkec (panggil fix-usaha-kdkec via inline)
 *  4. Pastikan folder public/uploads ada
 *
 * Run: node scripts/migrate-iterasi9.mjs
 */
import mysql from 'mysql2/promise'
import { readFileSync, mkdirSync } from 'node:fs'
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

// 1. Migration
for (const stmt of splitStatements(readFileSync(resolve(root, 'db/migrations/2026_se2026_iterasi9.sql'), 'utf-8'))) {
  try { await conn.query(stmt) } catch (e) {
    if (!['ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME'].includes(e.code)) throw e
  }
}
console.log('✓ Migration iterasi9 (posts, tim_se) applied')

// 2. Seed
await conn.query(readFileSync(resolve(root, 'db/seed/iterasi9.sql'), 'utf-8'))
console.log('✓ Seed iterasi9 (posts + tim_se) applied')

// 3. Repair usaha.kdkec berdasar geojson kanonik
const kecGeo = JSON.parse(readFileSync(resolve(root, 'public/geo/musirawas_kec.geojson'), 'utf-8'))
const nameToIdkec = new Map()
for (const f of kecGeo.features) nameToIdkec.set(String(f.properties.nmkec).toUpperCase().trim(), String(f.properties.idkec))
const [urows] = await conn.execute('SELECT idsbr, kdkec, nmkec FROM usaha')
let upd = 0, del = 0
for (const r of urows) {
  const canon = nameToIdkec.get(String(r.nmkec).toUpperCase().trim())
  if (canon) {
    if (canon !== String(r.kdkec)) { await conn.execute('UPDATE usaha SET kdkec=? WHERE idsbr=?', [canon, r.idsbr]); upd++ }
  } else if (String(r.idsbr).startsWith('SAMPLE')) {
    await conn.execute('DELETE FROM usaha WHERE idsbr=?', [r.idsbr]); del++
  }
}
console.log(`✓ Repair usaha.kdkec: updated=${upd}, deleted(dummy bogus)=${del}`)

// 4. uploads dir
mkdirSync(resolve(root, 'public/uploads/posts'), { recursive: true })
mkdirSync(resolve(root, 'public/uploads/tim'), { recursive: true })
console.log('✓ public/uploads/{posts,tim} siap')

const [[c]] = await conn.query('SELECT (SELECT COUNT(*) FROM posts) posts, (SELECT COUNT(*) FROM tim_se) tim, (SELECT COUNT(DISTINCT kdkec) FROM usaha) kec')
console.log(`\nRINGKASAN → posts=${c.posts}, tim_se=${c.tim}, kdkec unik=${c.kec}`)
await conn.end()
