/**
 * Generate db/seed/dummy.sql untuk demo:
 *  - 12 tahapan_akses (variasi tipe Drive/Dokumen/Spreadsheet/Form/Link)
 *  - 80 usaha sample tersebar 14 kec + 199 desa
 *     skala: 70% UMK, 20% UM, 10% UB
 *     status: 35% selesai, 30% belum, 20% proses, 10% tolak, 5% tutup
 *     lat/lng: jitter dari center Musi Rawas (-3.0, 102.95) ± 0.25°
 *
 * Run: node scripts/seed-dummy.mjs
 * Apply: mysql -u root <DB> < db/seed/dummy.sql
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = process.cwd()
const outFile = resolve(root, 'db/seed/dummy.sql')

const esc = (s) => String(s).replace(/'/g, "''")

// ---------- 1. tahapan_akses ----------
const aksesRows = [
  [1, 'Pedoman Sosialisasi SE2026',     'https://drive.google.com/drive/folders/1abc-sosialisasi-se2026', 'drive',       1],
  [1, 'Materi Sosialisasi (Slide)',     'https://docs.google.com/presentation/d/1xyz-slide-sosialisasi/edit', 'dokumen',     2],
  [1, 'Form Permintaan Sosialisasi',    'https://forms.gle/sample-form-sosialisasi-bps',                  'form',        3],
  [2, 'Modul Pelatihan Petugas',        'https://drive.google.com/drive/folders/1abc-modul-pelatihan',    'drive',       1],
  [2, 'Daftar Hadir Pelatihan',         'https://docs.google.com/spreadsheets/d/1xyz-hadir-pelatihan/edit','spreadsheet', 2],
  [3, 'Panduan Pencacahan Online',      'https://drive.google.com/drive/folders/1abc-online',             'drive',       1],
  [3, 'Portal Self-Enumeration',        'https://sensus.bps.go.id/se2026',                                'link',        2],
  [4, 'Pedoman Door-to-Door',           'https://drive.google.com/drive/folders/1abc-d2d',                'drive',       1],
  [4, 'Form Laporan Harian Petugas',    'https://forms.gle/laporan-harian-d2d-bps',                       'form',        2],
  [4, 'Sheet Tracking Realisasi',       'https://docs.google.com/spreadsheets/d/1xyz-tracking/edit',      'spreadsheet', 3],
  [5, 'Pedoman Validasi Data',          'https://drive.google.com/drive/folders/1abc-validasi',           'drive',       1],
  [6, 'Template Publikasi Hasil',       'https://docs.google.com/document/d/1xyz-template-pub/edit',      'dokumen',     1],
]

// ---------- 2. usaha dummy ----------
// Daftar 14 kec Musi Rawas diturunkan LANGSUNG dari geojson kanonik
// (public/geo/musirawas_{kec,desa}.geojson) → kode kdkec & kddesa dijamin
// konsisten dengan peta. KECS entry: [kdkec(7), nmkec, kddesa(10), nmdesa]
function composedKdkec(p) { return `${p.kdprov ?? ''}${p.kdkab ?? ''}${p.kdkec ?? ''}` }
const kecGeo = JSON.parse(readFileSync(resolve(root, 'public/geo/musirawas_kec.geojson'), 'utf-8'))
const desaGeo = JSON.parse(readFileSync(resolve(root, 'public/geo/musirawas_desa.geojson'), 'utf-8'))
// sample 1 desa per kdkec (komposit) dari desa geojson
const desaByKec = new Map()
for (const f of desaGeo.features) {
  const k = composedKdkec(f.properties)
  if (!desaByKec.has(k)) desaByKec.set(k, { iddesa: String(f.properties.iddesa), nmdesa: String(f.properties.nmdesa) })
}
const KECS = kecGeo.features.map(f => {
  const idkec = String(f.properties.idkec)
  const nmkec = String(f.properties.nmkec)
  const d = desaByKec.get(idkec) ?? { iddesa: `${idkec}001`, nmdesa: nmkec }
  return [idkec, nmkec, d.iddesa, d.nmdesa]
})

const SKALA_DIST = [
  ...Array(70).fill('UMK'),
  ...Array(20).fill('UM'),
  ...Array(10).fill('UB'),
]
const STATUS_DIST = [
  ...Array(35).fill('selesai'),
  ...Array(30).fill('belum'),
  ...Array(20).fill('proses'),
  ...Array(10).fill('tolak'),
  ...Array(5).fill('tutup'),
]

const NAMA_TEMPLATE = [
  'Warung', 'Toko', 'CV', 'PT', 'Kios', 'UD', 'Bengkel', 'Salon', 'Apotek', 'Mini Market',
]
const NAMA_SUFFIX = [
  'Bu Siti', 'Pak Joko', 'Maju Jaya', 'Sumber Berkah', 'Sinar Mas', 'Bahagia', 'Sejahtera',
  'Mandiri', 'Sukses', 'Rezeki', 'Barokah', 'Mulia', 'Sentosa', 'Cahaya', 'Harapan',
]

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]

const usahaRows = []
for (let i = 0; i < 80; i++) {
  const kec = rand(KECS)
  const skala = rand(SKALA_DIST)
  const status = rand(STATUS_DIST)
  const idsbr = `SAMPLE${String(i + 1).padStart(5, '0')}`
  const nama = `${rand(NAMA_TEMPLATE)} ${rand(NAMA_SUFFIX)}`
  const alamat = `Jl. ${rand(['Sudirman', 'Diponegoro', 'Veteran', 'Pahlawan', 'Mawar', 'Melati'])} No. ${Math.floor(Math.random() * 100) + 1}`
  const lat = -3.0 + (Math.random() - 0.5) * 0.5
  const lng = 102.95 + (Math.random() - 0.5) * 0.5
  const tanggal = status === 'selesai' || status === 'tolak' || status === 'tutup'
    ? `2026-05-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
    : null

  usahaRows.push([idsbr, nama, alamat, kec[0], kec[1], kec[2], kec[3], skala, status, tanggal, lat.toFixed(6), lng.toFixed(6)])
}

// ---------- emit SQL ----------
const lines = [
  '-- Auto-generated dummy seed (scripts/seed-dummy.mjs)',
  '-- Re-run: node scripts/seed-dummy.mjs',
  '',
  '-- ===== TAHAPAN AKSES =====',
  ...aksesRows.map(([t, nama, url, tipe, urut]) =>
    `INSERT IGNORE INTO tahapan_akses (tahapan_id, nama, url, tipe, urutan) VALUES (${t}, '${esc(nama)}', '${esc(url)}', '${tipe}', ${urut});`,
  ),
  '',
  '-- ===== USAHA DUMMY (80 sample) =====',
  ...usahaRows.map(([idsbr, nama, alamat, kdkec, nmkec, kddesa, nmdesa, skala, status, tanggal, lat, lng]) =>
    `INSERT IGNORE INTO usaha (idsbr, nama, alamat, kdprov, kdkab, kdkec, kddesa, nmprov, nmkab, nmkec, nmdesa, skala_usaha, status_pencacahan, tanggal_cacah, lat, lng) VALUES ` +
    `('${idsbr}', '${esc(nama)}', '${esc(alamat)}', '16', '05', '${kdkec}', '${kddesa}', 'SUMATERA SELATAN', 'MUSI RAWAS', '${esc(nmkec)}', '${esc(nmdesa)}', '${skala}', '${status}', ${tanggal ? `'${tanggal}'` : 'NULL'}, ${lat}, ${lng});`,
  ),
  '',
]

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, lines.join('\n'), 'utf-8')
console.log(`✓ Wrote ${aksesRows.length} tahapan_akses + ${usahaRows.length} usaha to ${outFile}`)
