/**
 * Scaffold dashboard untuk sensus baru.
 *
 * Usage: node scripts/scaffold-sensus.mjs <kode> <tahun>
 * Contoh: node scripts/scaffold-sensus.mjs sp 2030
 *
 * Copy app/se/2026/(admin)/ → app/<kode>/<tahun>/(admin)/
 * Auto-replace konstanta SENSUS={kode:'se',tahun:2026} ke nilai baru.
 * Tidak menyentuh app/<kode>/<tahun>/(public)/ — user buat sendiri konten publik.
 *
 * Setelah jalan:
 *  1. Tambah row sensus_config DB untuk (kode, tahun) baru
 *  2. Grant akses user via INSERT INTO user_sensus_access
 *  3. npm run dev → akses /<kode>/<tahun>/login
 */
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const [,, kode, tahunStr] = process.argv
if (!kode || !tahunStr) {
  console.error('Usage: node scripts/scaffold-sensus.mjs <kode> <tahun>')
  console.error('       node scripts/scaffold-sensus.mjs sp 2030')
  process.exit(1)
}
const tahun = Number(tahunStr)
if (!/^[a-z]{1,5}$/.test(kode) || !Number.isInteger(tahun)) {
  console.error('kode harus 1-5 huruf kecil, tahun harus integer')
  process.exit(1)
}

const COLORS = { sp: '#1877F2', st: '#00A651', se: '#E8751A' }
const ACCENTS = { sp: '#E0F0FF', st: '#E8FFF3', se: '#FFF0DC' }
const ACCENT_TEXT = { sp: '#0F5BCD', st: '#007A3D', se: '#C85E0A' }
const primary = COLORS[kode] ?? '#0F1E3D'
const accent = ACCENTS[kode] ?? '#F0F4FA'
const accentText = ACCENT_TEXT[kode] ?? '#0F1E3D'

const SRC = resolve('app/se/2026/(admin)')
const DST = resolve(`app/${kode}/${tahun}/(admin)`)

if (!existsSync(SRC)) {
  console.error(`Source tidak ditemukan: ${SRC}`)
  process.exit(1)
}
if (existsSync(DST)) {
  console.error(`Target sudah ada: ${DST} — hapus dulu kalau mau re-scaffold`)
  process.exit(1)
}

console.log(`Scaffold ${kode.toUpperCase()} ${tahun} ← copy dari SE 2026…`)
cpSync(SRC, DST, { recursive: true })

// Walk + replace
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(entry)) {
      let content = readFileSync(full, 'utf-8')
      const before = content
      content = content
        .replace(/kode: 'se'/g, `kode: '${kode}'`)
        .replace(/tahun: 2026/g, `tahun: ${tahun}`)
        .replace(/label: 'SE 2026'/g, `label: '${kode.toUpperCase()} ${tahun}'`)
        .replace(/primary: '#E8751A'/g, `primary: '${primary}'`)
        .replace(/accent: '#FFF0DC'/g, `accent: '${accent}'`)
        .replace(/accentText: '#C85E0A'/g, `accentText: '${accentText}'`)
        .replace(/\/se\/2026\//g, `/${kode}/${tahun}/`)
        .replace(/'\/se\/2026'/g, `'/${kode}/${tahun}'`)
      if (before !== content) {
        writeFileSync(full, content, 'utf-8')
        console.log(`  ✓ ${full.replace(resolve('.') + '\\', '').replace(resolve('.') + '/', '')}`)
      }
    }
  }
}
walk(DST)

// Buat folder public kosong (user isi sendiri konten)
const pubDst = resolve(`app/${kode}/${tahun}/(public)`)
if (!existsSync(pubDst)) {
  mkdirSync(pubDst, { recursive: true })
  // Minimal layout (akan fetch sensus_config dari DB)
  writeFileSync(join(pubDst, 'layout.tsx'), `import { getSensusConfig } from '@/lib/sensusConfig'
import NavbarSensus from '@/components/layout/NavbarSensus'
import FooterSensus from '@/components/layout/FooterSensus'

export default async function ${kode.toUpperCase()}${tahun}Layout({ children }: { children: React.ReactNode }) {
  const config = await getSensusConfig('${kode}', ${tahun})
  return (
    <>
      <NavbarSensus config={config} />
      <main style={{ flex: 1 }}>{children}</main>
      <FooterSensus config={config} />
    </>
  )
}
`)
  // Placeholder page
  writeFileSync(join(pubDst, 'page.tsx'), `export default function Page() {
  return (
    <div style={{ maxWidth: 900, margin: '60px auto', padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: '${primary}' }}>${kode.toUpperCase()} ${tahun}</h1>
      <p style={{ color: '#6B6B6B', marginTop: 12 }}>Konten ${kode.toUpperCase()} ${tahun} sedang dipersiapkan.</p>
    </div>
  )
}
`)
  console.log(`  + ${pubDst} (publik placeholder)`)
}

console.log(`\n✓ Scaffold selesai untuk ${kode.toUpperCase()} ${tahun}.`)
console.log(`\nLangkah berikut:`)
console.log(`  1. Tambah row sensus_config DB:`)
console.log(`     INSERT INTO sensus_config (sensus_kode, tahun, ...) VALUES ('${kode}', ${tahun}, ...);`)
console.log(`  2. Grant akses user: INSERT INTO user_sensus_access (user_id, sensus_kode, tahun, role) VALUES (1, '${kode}', ${tahun}, 'admin');`)
console.log(`  3. Build & akses /${kode}/${tahun}/login`)
