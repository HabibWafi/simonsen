/**
 * Generate db/seed/iterasi9.sql:
 *  - posts: 6 sosialisasi dari mockPosts + body artikel (sama spt sekarang)
 *  - tim_se: 4 struktural (sama spt halaman tentang sekarang)
 *
 * Run: node scripts/seed-iterasi9.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = process.cwd()
const outFile = resolve(root, 'db/seed/iterasi9.sql')
const esc = (s) => String(s).replace(/'/g, "''")

// ---------- posts (judul, slug, kategori, excerpt, author, created_at) ----------
const posts = [
  { judul: 'Kick-off Pencacahan SE2026 di Kecamatan Muara Beliti', slug: 'kickoff-pencacahan-muara-beliti', kategori: 'berita', excerpt: 'BPS Kabupaten Musi Rawas secara resmi memulai pencacahan SE2026 di Kecamatan Muara Beliti dengan melibatkan 4 petugas lapangan terlatih.', created_at: '2026-05-01 09:00:00' },
  { judul: 'Pelatihan Petugas SE2026 Gelombang II Selesai Dilaksanakan', slug: 'pelatihan-petugas-gelombang-2', kategori: 'sosialisasi', excerpt: 'Sebanyak 28 petugas lapangan dan 6 koordinator kecamatan telah menyelesaikan pelatihan teknis pencacahan SE2026 selama 3 hari.', created_at: '2026-04-28 10:00:00' },
  { judul: 'Infografis: 18 Kategori Usaha yang Dicacah dalam SE2026', slug: 'infografis-18-kategori-usaha', kategori: 'infografis', excerpt: 'Sensus Ekonomi 2026 mencakup 18 kategori lapangan usaha non-pertanian, dari perdagangan hingga jasa keuangan.', created_at: '2026-04-20 08:00:00' },
  { judul: 'Pengumuman: Jadwal Sosialisasi SE2026 Tingkat Desa', slug: 'jadwal-sosialisasi-tingkat-desa', kategori: 'pengumuman', excerpt: 'BPS Kab. Musi Rawas akan menyelenggarakan sosialisasi SE2026 di seluruh desa/kelurahan pada bulan Mei 2026.', created_at: '2026-04-15 07:00:00' },
  { judul: 'Video: Cara Mengisi Kuesioner SE2026 Online', slug: 'video-cara-isi-kuesioner-online', kategori: 'video', excerpt: 'Panduan lengkap pengisian kuesioner SE2026 secara online melalui portal sensus.bps.go.id/se2026.', created_at: '2026-04-10 11:00:00' },
  { judul: 'Persiapan SE2026: BPS Musi Rawas Lakukan Pemetaan Blok Sensus', slug: 'persiapan-pemetaan-blok-sensus', kategori: 'berita', excerpt: 'Tim BPS Kabupaten Musi Rawas telah menyelesaikan pemutakhiran peta blok sensus untuk keperluan pendataan SE2026.', created_at: '2026-03-25 09:00:00' },
]

// Body artikel (markdown sederhana) — sama dengan ARTICLE_BODY di [slug]/page.tsx
const BODY = {
  'kickoff-pencacahan-muara-beliti': `BPS Kabupaten Musi Rawas secara resmi memulai kegiatan pencacahan Sensus Ekonomi 2026 (SE2026) di Kecamatan Muara Beliti pada Kamis, 1 Mei 2026. Kegiatan ini ditandai dengan upacara pelepasan 4 petugas lapangan yang telah menyelesaikan pelatihan teknis selama tiga hari.

Kepala BPS Kabupaten Musi Rawas, Drs. Ahmad Fauzi, M.Si., menyampaikan bahwa kecamatan Muara Beliti dipilih sebagai titik awal pencacahan karena memiliki konsentrasi usaha tertinggi di wilayah Musi Rawas, dengan estimasi 1.240 unit usaha yang harus didata.

"Kami menargetkan penyelesaian pencacahan di Muara Beliti dalam waktu 45 hari kerja, dengan rata-rata 28 usaha per hari per petugas," ujar Ahmad Fauzi dalam keterangan resminya.

Para petugas lapangan dilengkapi dengan tablet Android berisi aplikasi CAWI (Computer-Assisted Web Interviewing) yang terhubung langsung ke server pusat BPS. Setiap data yang dikumpulkan akan langsung tervalidasi secara otomatis oleh sistem.

## Jadwal Pencacahan Bertahap

Pencacahan SE2026 di Kabupaten Musi Rawas akan dilakukan secara bertahap di 14 kecamatan hingga 31 Agustus 2026. Setelah Muara Beliti, tim BPS akan bergerak ke Kecamatan Tugumulyo dan Suku Tengah Lakitan Ulu pada minggu kedua Mei.

Pelaku usaha yang belum mengisi kuesioner online diminta untuk segera mengaksesnya melalui portal sensus.bps.go.id/se2026 sebelum petugas lapangan berkunjung ke lokasi usaha.

## Dukungan Pemerintah Daerah

Pemerintah Kabupaten Musi Rawas melalui Dinas Koperasi dan UKM turut memberikan dukungan penuh terhadap pelaksanaan SE2026. Mereka akan membantu menyebarluaskan informasi dan mengimbau para pelaku usaha untuk bersedia diwawancarai.

Bagi masyarakat yang membutuhkan informasi lebih lanjut tentang SE2026, dapat menghubungi BPS Kabupaten Musi Rawas melalui nomor WhatsApp yang tertera di halaman kontak.`,
  'pelatihan-petugas-gelombang-2': `Sebanyak 28 petugas lapangan dan 6 koordinator kecamatan telah menyelesaikan pelatihan teknis pencacahan Sensus Ekonomi 2026 (SE2026) gelombang kedua yang berlangsung pada 26–28 April 2026 di Aula BPS Kabupaten Musi Rawas.

Pelatihan gelombang II ini merupakan lanjutan dari pelatihan gelombang I yang telah digelar pada awal April. Total peserta yang telah dilatih kini mencapai 56 petugas lapangan dan 12 koordinator kecamatan, siap mendukung pencacahan di seluruh 14 kecamatan Musi Rawas.

## Materi Pelatihan

Selama tiga hari, peserta mendapatkan pembekalan komprehensif meliputi:

- Hari 1: Konsep dasar SE2026, cakupan dan klasifikasi usaha (18 kategori KBLI)
- Hari 2: Teknik wawancara, penggunaan aplikasi CAWI, dan manajemen wilayah kerja
- Hari 3: Praktik lapangan di Pasar Muara Beliti, evaluasi, dan uji kompetensi

Seluruh peserta dinyatakan lulus uji kompetensi dengan nilai rata-rata 87,4 dari 100.

## Kesiapan Peralatan

Setiap petugas lapangan mendapatkan perlengkapan standar berupa tablet Android dengan aplikasi SE2026 yang telah terpasang, rompi identitas BPS, kartu tugas, dan buku panduan lapangan. Koordinator kecamatan juga mendapatkan akses dashboard monitoring untuk memantau progress harian timnya.

Dengan selesainya pelatihan gelombang II ini, BPS Kabupaten Musi Rawas telah 100% siap dari sisi sumber daya manusia untuk melaksanakan pencacahan SE2026 sesuai jadwal yang ditetapkan.`,
  'infografis-18-kategori-usaha': `Sensus Ekonomi 2026 (SE2026) mencakup pendataan seluruh usaha/perusahaan non-pertanian yang beroperasi di wilayah Indonesia. Terdapat 18 kategori lapangan usaha yang menjadi cakupan SE2026, sebagaimana diklasifikasikan dalam Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) 2020.

## 18 Kategori Lapangan Usaha SE2026

1. Perdagangan Besar dan Eceran — Reparasi Mobil dan Sepeda Motor
2. Penyediaan Akomodasi dan Makan Minum — Hotel, restoran, warung, katering
3. Industri Pengolahan — Manufaktur, pabrik, home industry
4. Konstruksi — Kontraktor, jasa bangunan
5. Transportasi dan Pergudangan — Jasa angkutan, ekspedisi, gudang
6. Informasi dan Komunikasi — IT, media, telekomunikasi
7. Jasa Keuangan dan Asuransi — Bank, koperasi simpan pinjam, asuransi
8. Real Estate — Properti, agen perumahan

## Yang Tidak Tercakup dalam SE2026

Kegiatan pertanian tanaman pangan, perkebunan, peternakan, dan kehutanan tidak termasuk dalam cakupan SE2026 karena sudah dicakup dalam Sensus Pertanian.

Untuk informasi lebih lanjut, kunjungi portal resmi SE2026 di sensus.bps.go.id/se2026.`,
  'jadwal-sosialisasi-tingkat-desa': `BPS Kabupaten Musi Rawas bersama Pemerintah Daerah akan menyelenggarakan rangkaian kegiatan sosialisasi Sensus Ekonomi 2026 (SE2026) di tingkat desa/kelurahan sepanjang bulan Mei 2026.

## Materi Sosialisasi

Setiap sesi sosialisasi akan membahas:
- Tujuan dan manfaat SE2026 bagi perekonomian daerah
- Cara pengisian kuesioner online secara mandiri
- Hak dan kewajiban responden (pelaku usaha)
- Jadwal kunjungan petugas lapangan

## Peserta yang Diundang

Sosialisasi ditujukan kepada seluruh pelaku usaha di desa/kelurahan setempat, tokoh masyarakat, aparat desa, dan perwakilan UMKM. Kehadiran bersifat terbuka untuk umum.`,
  'video-cara-isi-kuesioner-online': `BPS Kabupaten Musi Rawas merilis panduan video cara mengisi kuesioner SE2026 secara online. Video ini dapat diakses oleh seluruh pelaku usaha di Kabupaten Musi Rawas yang ingin mengisi kuesioner secara mandiri sebelum didatangi petugas lapangan.

## Cara Mengisi Kuesioner SE2026 Online

### Langkah 1: Akses Portal
Buka browser dan ketik alamat sensus.bps.go.id/se2026 atau scan QR code yang tersedia di materi sosialisasi.

### Langkah 2: Registrasi
Masukkan Nomor Induk Berusaha (NIB) atau nomor registrasi usaha yang dikirimkan BPS via SMS/email.

### Langkah 3: Isi Data Usaha
Lengkapi formulir data usaha (identitas, kategori, tenaga kerja, omzet, aset).

### Langkah 4: Verifikasi dan Kirim
Periksa kembali seluruh data, lalu klik Kirim. Anda akan mendapat nomor konfirmasi.

## Batas Waktu

Pengisian kuesioner online dapat dilakukan hingga 31 Agustus 2026.`,
  'persiapan-pemetaan-blok-sensus': `Tim BPS Kabupaten Musi Rawas telah berhasil menyelesaikan pemutakhiran peta dan penetapan blok sensus untuk keperluan pendataan SE2026 pada akhir Maret 2026.

## Apa itu Blok Sensus?

Blok sensus adalah satuan wilayah kerja petugas pencacahan yang ditetapkan berdasarkan konsentrasi usaha di suatu wilayah. Satu blok sensus berisi sekitar 100–150 unit usaha.

## Hasil Pemetaan

- Total blok sensus: 72 blok
- Total estimasi usaha: 9.960 unit
- Kecamatan dengan blok sensus terbanyak: Muara Beliti, Tugumulyo

## Tindak Lanjut

BPS Kabupaten Musi Rawas kini memasuki tahap pembagian wilayah kerja kepada petugas lapangan dan koordinator kecamatan, sebelum pencacahan resmi dimulai pada Mei 2026.`,
}

// video embed contoh untuk kategori video
const VIDEO_URL = { 'video-cara-isi-kuesioner-online': 'https://www.youtube.com/embed/dQw4w9WgXcQ' }

// ---------- tim_se struktural (sama spt halaman tentang sekarang) ----------
const tim = [
  ['Drs. Ahmad Fauzi, M.Si', 'Kepala BPS Kab. Musi Rawas', 'struktural', 1],
  ['Siti Rahayu, S.ST',      'Penanggung Jawab SE2026',    'struktural', 2],
  ['Budi Santoso, S.ST',     'Koordinator Lapangan',       'struktural', 3],
  ['Dewi Lestari, S.ST',     'Pengolah Data',              'struktural', 4],
]

const lines = [
  '-- Auto-generated (scripts/seed-iterasi9.mjs)',
  '',
  '-- ===== POSTS =====',
  ...posts.map(p => {
    const mediaType = VIDEO_URL[p.slug] ? 'video' : 'none'
    const videoUrl = VIDEO_URL[p.slug] ? `'${esc(VIDEO_URL[p.slug])}'` : 'NULL'
    const konten = esc(BODY[p.slug] ?? p.excerpt)
    return `INSERT INTO posts (judul, slug, kategori, excerpt, konten, thumbnail, media_type, video_url, author, published, created_at) VALUES ` +
      `('${esc(p.judul)}', '${esc(p.slug)}', '${p.kategori}', '${esc(p.excerpt)}', '${konten}', NULL, '${mediaType}', ${videoUrl}, 'BPS Kab. Musi Rawas', 1, '${p.created_at}') ` +
      `ON DUPLICATE KEY UPDATE judul=VALUES(judul), kategori=VALUES(kategori), excerpt=VALUES(excerpt), konten=VALUES(konten), media_type=VALUES(media_type), video_url=VALUES(video_url);`
  }),
  '',
  '-- ===== TIM SE (struktural) =====',
  ...tim.map(([nama, peran, tipe, urut]) =>
    `INSERT INTO tim_se (nama, peran, tipe, urutan) SELECT '${esc(nama)}', '${esc(peran)}', '${tipe}', ${urut} ` +
    `FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM tim_se WHERE nama='${esc(nama)}' AND peran='${esc(peran)}');`,
  ),
  '',
]

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, lines.join('\n'), 'utf-8')
console.log(`✓ Wrote ${posts.length} posts + ${tim.length} tim_se to ${outFile}`)
