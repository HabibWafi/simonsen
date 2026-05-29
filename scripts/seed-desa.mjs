/**
 * Generate db/seed/desa.sql dari public/geo/musirawas_desa.geojson
 *
 * Run: node scripts/seed-desa.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = process.cwd()
const geoFile = resolve(root, 'public/geo/musirawas_desa.geojson')
const outFile = resolve(root, 'db/seed/desa.sql')

const geo = JSON.parse(readFileSync(geoFile, 'utf-8'))
const rows = []

for (const f of geo.features) {
  const p = f.properties || {}
  const kddesa = String(p.iddesa ?? '').trim()
  const nama   = String(p.nmdesa ?? '').trim()
  const kdkec  = String(p.idkec ?? `${p.kdprov}${p.kdkab}${p.kdkec}`).trim()
  const nmkec  = String(p.nmkec ?? '').trim()
  if (!kddesa || !nama || !kdkec || !nmkec) continue
  rows.push({ kddesa, nama, kdkec, nmkec })
}

const esc = (s) => String(s).replace(/'/g, "''")

const sql = [
  '-- Auto-generated from public/geo/musirawas_desa.geojson',
  '-- Re-run: node scripts/seed-desa.mjs',
  `-- Total: ${rows.length} desa`,
  '',
  ...rows.map(r =>
    `INSERT IGNORE INTO desa (kddesa, nama, kdkec, nmkec) VALUES ('${esc(r.kddesa)}', '${esc(r.nama)}', '${esc(r.kdkec)}', '${esc(r.nmkec)}');`,
  ),
  '',
].join('\n')

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, sql, 'utf-8')
console.log(`✓ Wrote ${rows.length} desa to ${outFile}`)
