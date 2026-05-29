/**
 * Repair konsistensi kode kdkec di tabel `usaha`.
 *
 * Masalah: dummy lama memakai kode kdkec SALAH (mis. MUARA BELITI=1605130)
 * sementara geojson + data master asli memakai kode KANONIK (MUARA BELITI=1605050).
 * Akibatnya 1 nama kecamatan punya 2 kdkec → duplikat di dropdown + drill-down kosong.
 *
 * Strategi (idempotent):
 *  1. Bangun peta NAMA→idkec kanonik dari public/geo/musirawas_kec.geojson.
 *  2. Untuk row usaha yang nmkec cocok geojson tapi kdkec beda → UPDATE kdkec ke kanonik.
 *  3. Untuk row dummy (idsbr LIKE 'SAMPLE%') yang nmkec TIDAK ada di geojson
 *     (kecamatan bogus spt BTS ULU, RAWAS ILIR, KARANG JAYA) → DELETE.
 *
 * Run: node scripts/fix-usaha-kdkec.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import mysql from 'mysql2/promise'

const root = process.cwd()

function loadEnv() {
  const env = {}
  try {
    for (const line of readFileSync(resolve(root, '.env.local'), 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].trim()
    }
  } catch {}
  return env
}

const env = loadEnv()

// NAMA (UPPER) → idkec kanonik
const kecGeo = JSON.parse(readFileSync(resolve(root, 'public/geo/musirawas_kec.geojson'), 'utf-8'))
const nameToIdkec = new Map()
for (const f of kecGeo.features) {
  nameToIdkec.set(String(f.properties.nmkec).toUpperCase().trim(), String(f.properties.idkec))
}

const conn = await mysql.createConnection({
  host: env.DB_HOST || 'localhost',
  user: env.DB_USER || 'root',
  password: env.DB_PASS || '',
  database: env.DB_NAME || 'se2026_bps',
})

const [rows] = await conn.execute('SELECT idsbr, kdkec, nmkec FROM usaha')
let updated = 0, deleted = 0, ok = 0
for (const r of rows) {
  const canon = nameToIdkec.get(String(r.nmkec).toUpperCase().trim())
  if (canon) {
    if (canon !== String(r.kdkec)) {
      await conn.execute('UPDATE usaha SET kdkec = ? WHERE idsbr = ?', [canon, r.idsbr])
      updated++
    } else ok++
  } else {
    // nmkec tidak ada di geojson kanonik
    if (String(r.idsbr).startsWith('SAMPLE')) {
      await conn.execute('DELETE FROM usaha WHERE idsbr = ?', [r.idsbr])
      deleted++
    } else {
      console.warn(`  ⚠ kecamatan non-kanonik (data asli, dibiarkan): ${r.nmkec} [${r.kdkec}] idsbr=${r.idsbr}`)
    }
  }
}

const [grp] = await conn.execute('SELECT COUNT(DISTINCT kdkec) k, COUNT(DISTINCT nmkec) n FROM usaha')
console.log(`\n✓ Repair selesai. updated=${updated}, deleted(dummy bogus)=${deleted}, sudah benar=${ok}`)
console.log(`✓ Sekarang ${grp[0].k} kdkec unik, ${grp[0].n} nama kecamatan unik`)
await conn.end()
