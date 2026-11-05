# Deployment & Multi-Tenant Guide — Portal Sensus BPS Musi Rawas

Project ini adalah **portal SE2026** (Sensus Ekonomi 2026) yang merupakan bagian dari ekosistem multi-sensus BPS Kabupaten Musi Rawas. Dokumen ini menjelaskan:

1. Cara deploy project ini di berbagai environment (dev, staging, prod)
2. Konvensi & langkah untuk membangun project sensus berikutnya (SP 2030, ST 2033)

---

## 1. Arsitektur Multi-Tenant

```
sensus.bpskabmusirawas.com/              ← portal landing (project terpisah)
sensus.bpskabmusirawas.com/se/2026       ← PROJECT INI (Sensus Ekonomi 2026)
sensus.bpskabmusirawas.com/sp/2030       ← Sensus Penduduk 2030 (depan, repo terpisah)
sensus.bpskabmusirawas.com/st/2033       ← Sensus Pertanian 2033 (depan, repo terpisah)
```

**Prinsip**:
- Setiap sensus = repo & deployment terpisah → frontend + backend masing-masing → maintainable
- Path prefix di-set lewat **env var** (`NEXT_PUBLIC_BASE_PATH`) — **tidak hardcoded** di code
- Asset & internal link otomatis ke-prefix oleh Next.js `basePath`/`assetPrefix`
- URL raw (`<img>`, CSS background) pakai helper `withBase()` di `lib/basePath.ts`

---

## 2. Setup Environment

Salin `.env.example` jadi `.env.local` lalu sesuaikan:

```bash
cp .env.example .env.local
```

**Variabel utama:**

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `NEXT_PUBLIC_BASE_PATH` | _(kosong)_ | `/se/2026-staging` | `/se/2026` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://staging.bpskabmusirawas.com/se/2026-staging` | `https://sensus.bpskabmusirawas.com/se/2026` |
| `NEXTAUTH_SECRET` | random 32-char | random | random |
| `DB_*` | Laragon MySQL | MySQL staging | Hostinger MySQL |

---

## 3. Build & Deploy

### Rilis monitoring PES SE2026

1. Terapkan `db/migrations/2026_se2026_pes.sql` pada database aplikasi **sebelum**
   merge/rilis kode. SQL hanya menambahkan `pes_snapshot`, `pes_petugas`, dan
   `pes_petugas_harian` dengan `CREATE TABLE IF NOT EXISTS`; dapat dijalankan ulang.
   Tidak mengubah tabel Fasih maupun data SE2026 utama.
2. Dari checkout dengan konfigurasi DB aplikasi yang benar, jalankan
   `npm run db:migrate-pes`. Skrip membaca konfigurasi DB yang sudah tersedia;
   jangan menaruh kredensial di source atau argumen CLI. Alternatif hPanel:
   phpMyAdmin database situs → SQL → jalankan isi file migrasi tersebut.
3. Pastikan tiga tabel tersedia, jalankan `npm run security:check`,
   `npm run test:schedule`, tes MySQL disposable, dan `npm run build`.
   Push branch, buka PR, lalu merge ke `main` untuk auto deploy Hostinger.
4. Verifikasi `/se/2026/pes` dan `/api/se/2026/public/pes`. Sebelum scraper
   terhubung, kondisi menunggu data adalah hasil yang diharapkan. Jika tabel belum
   siap, API mengembalikan 503 dan halaman menampilkan status belum tersedia.
5. Saat scraper siap, admin membuat token SE2026 khusus `write:pes` melalui
   dashboard API. Token progress lama tidak otomatis diperluas. Hubungkan scraper
   menurut [kontrak PES](docs/api/pes-2026.md); tahap ini tidak membuat scraper
   atau menyimpan token produksi baru.

Rollback kode dapat memakai commit sebelum rilis; biarkan tabel PES tetap ada agar
snapshot tidak hilang. Jangan menjatuhkan tabel sebagai bagian rollback rutin.

### Dev lokal
Gunakan Node.js 24 minimal 24.22.1, sesuai `.nvmrc`, `.node-version`, dan `engines`.
Versi CLI lokal bukan bukti bahwa proses hosting sudah memakai patch yang sama.

```bash
npm ci
npm run dev
# → http://localhost:3000
```

### Build production
Hostinger dapat memasang hanya dependency produksi saat `NODE_ENV=production`.
Paket deklarasi tipe yang diperlukan oleh `next build`, termasuk `@types/yauzl`,
harus tersedia di `dependencies`. Untuk memeriksa kondisi ini, jalankan
`npm ci --omit=dev` lalu `npm run build`.

Build dibatasi ke satu worker melalui `experimental.cpus: 1` di `next.config.ts`.
Ini menghindari pembuatan puluhan worker ketika hosting memperlihatkan jumlah CPU
host yang lebih besar dari kuota proses/thread container. Build dapat lebih lama;
pengaturan ini membatasi worker build, bukan jumlah CPU server aplikasi saat berjalan.

```bash
# Set env, build, run
export NEXT_PUBLIC_BASE_PATH=/se/2026
npm ci
npm run security:check
npm run build
npm run start
# → http://localhost:3000/se/2026
```

### Deploy ke Hostinger / VPS
1. Set env var di hosting panel (Vercel/Hostinger/PM2/Docker):
   ```
   NEXT_PUBLIC_BASE_PATH=/se/2026
   NEXTAUTH_URL=https://sensus.bpskabmusirawas.com/se/2026
   NEXTAUTH_SECRET=...
   DB_HOST=...
   ```
2. Reverse proxy (Nginx) — strip `/se/2026` lalu forward ke Next.js standalone server:
   ```nginx
   location /se/2026/ {
     proxy_pass http://localhost:3000/se/2026/;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
3. `npm run build` lalu jalankan `node .next/standalone/server.js` (output mode `standalone`).

---

## 4. Konvensi untuk Sensus Berikutnya

Saat membangun **SP 2030**, **ST 2033**, atau sensus lain — clone repo ini sebagai template lalu customize:

### Naming
- **Repo**: `<sensus>-<tahun>-bps-<wilayah>` → `sp2030-bps-musirawas`, `st2033-bps-musirawas`
- **Domain path**: `/sp/2030`, `/st/2033`

### File yang HARUS diganti per-sensus

| File | Yang diganti |
|------|--------------|
| `.env.local` | `NEXT_PUBLIC_BASE_PATH=/sp/2030` (sesuai sensus) |
| `package.json` | `"name"` field |
| `app/layout.tsx` | `metadata.title`, `metadata.description`, `metadata.openGraph` |
| `components/layout/Navbar.tsx` | Wordmark teks (tetap "Badan Pusat Statistik" / "Kabupaten Musi Rawas", atau ubah sesuai) |
| `public/images/mascot/<mascot>.png` | Maskot per sensus (SE = Bung Itung, SP = TBD, ST = TBD) |
| `public/images/logo-bps.png` | _(shared, tidak perlu ubah)_ |
| `lib/mockData.ts` | Tanggal target countdown, jadwal timeline, kategori usaha, stats seed |
| `components/HeroLanding.tsx` | Path mascot, copy headline (sesuai sensus) |
| `app/page.tsx` | Heading & copy semua section |
| `app/globals.css` | Primary palette **jika brand color beda per sensus**: SE = oranye `#E8751A`, SP = biru `#1877F2`, ST = hijau `#00A651` (saran) |

### File yang TIDAK perlu diubah (shared pattern)
- `components/decor/*.tsx` — reusable, pakai PNG di `/public/images/decor/`
- `components/AnimatedSection.tsx` — generic motion wrapper
- `components/layout/Footer.tsx` — info BPS Musi Rawas yang sama
- `lib/basePath.ts` — helper universal
- `next.config.ts` — basePath dari env, no hardcode

### Asset per sensus
```
public/images/
├── logo-bps.png              ← shared
├── decor/                    ← shared (5 file PNG transparan)
│   ├── wave.png
│   ├── chevron.png
│   ├── wave-loop.png
│   ├── wave-ribbon.png
│   └── dots.png
└── mascot/                   ← per-sensus
    └── bung-itung.png        ← SE2026 (project ini)
    └── ...                   ← SP2030, ST2033 nanti
```

---

## 5. Catatan Shared Design System (Future)

Saat ini, code reuse antar sensus dilakukan dengan **clone & customize** — sengaja **belum** diabstraksi ke shared library.

**Alasan**: belum ada cukup data (baru 1 sensus jalan) untuk tahu pattern mana yang benar-benar reusable vs yang sensus-specific. Premature abstraction = biaya maintenance yang tinggi.

**Kapan harus ekstrak ke library**:
- Saat sensus kedua (SP 2030) selesai build awal → bandingkan kode mana yang benar-benar duplikat
- Komponen kandidat ekstraksi: `components/decor/`, `components/AnimatedSection.tsx`, `components/layout/Navbar.tsx` (template), `components/layout/Footer.tsx`, `lib/basePath.ts`
- Target: npm package internal `@bps-musirawas/sensus-ui` di registry private (npm/GitHub Packages/Verdaccio)

---

## 6. Troubleshooting

### Aset tidak muncul setelah deploy prod
- Cek `NEXT_PUBLIC_BASE_PATH` sudah di-set sebelum `npm run build` (build-time env var, bukan runtime)
- Cek file PNG di `public/images/...` sudah masuk ke `.next/standalone/public/...` (ada di static output)
- Cek view source: image `src` harus mulai dengan `/se/2026/...`

### Smooth scroll "Pelajari SE2026" tidak jalan
- Cek `<html data-scroll-behavior="smooth">` di `app/layout.tsx`
- Cek ApaSection punya `id="apa-itu-se2026"` dan `scrollMarginTop`

### Mascot Bung Itung broken image
- Upload file ke `public/images/mascot/bung-itung.png` (PNG transparan bersih)
- Cek path Next/Image dengan basePath sudah di-prefix otomatis

---

## 7. Deploy via Upload ZIP (Hostinger)

Workflow yang dipakai sehari-hari: bungkus source jadi 1 ZIP, upload ke
Hostinger via hPanel File Manager, lalu install + build di sana. **Tidak**
pakai git push.

### A. Generate ZIP deploy di lokal
```bash
git archive --format=zip --output=se2026-deploy.zip HEAD
```
- Hanya file yang ter-commit yang ikut → otomatis tidak ada `node_modules`,
  `.next`, `.git`, `.env*`, atau zip backup (`se.zip`, `se2026.zip`).
- Hasil ~9 MB, ~240 file.
- Verifikasi cepat:
  ```bash
  unzip -l se2026-deploy.zip | grep -E "node_modules|\\.next/|\\.env|\\.git/"   # harus kosong
  ```

### B. Upload di Hostinger
1. **File Manager**: hPanel → Domain `sensus.bpskabmusirawas.com` →
   File Manager → masuk ke folder app Node.js (mis. `domains/<domain>/public_html`).
2. Upload `se2026-deploy.zip` → klik kanan → **Extract**.
3. (Opsional) hapus file `se2026-deploy.zip` setelah ekstrak.

### C. Konfigurasi Node.js panel
hPanel → Advanced → Node.js:
- **Application root**: folder tempat zip diekstrak.
- **Application URL**: `https://sensus.bpskabmusirawas.com`.
- **Application startup file**: `npm start`.
- **Node.js version**: 24, minimal 24.22.1. Pastikan versi efektif proses/worker, bukan hanya pilihan major pada panel.

### D. Environment Variables
hPanel → Advanced → Node.js → **Environment Variables**, tambah
satu-per-satu dari file lokal `.env-production`:

| Variable | Nilai |
|----------|-------|
| `NODE_ENV` | `production` |
| `HOSTNAME` | `0.0.0.0` |
| `NEXTAUTH_URL` | `https://sensus.bpskabmusirawas.com` |
| `NEXTAUTH_SECRET` | (dari `.env-production`, jangan dishare) |
| `AUTH_TRUST_HOST` | `true` |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_USER` | `uXXXXXXXX_se2026` |
| `DB_PASS` | (password DB Hostinger) |
| `DB_NAME` | `uXXXXXXXX_se2026` |
| `BOOTSTRAP_ADMIN_NIP` | `admin` |
| `BOOTSTRAP_ADMIN_NAMA` | `Administrator` |
| `BOOTSTRAP_ADMIN_PASSWORD` | (wajib diisi; minimal 12 karakter, maksimal 72 byte UTF-8) |

> ⚠️ `.env-production` **tidak ikut** di ZIP — secret-nya cukup di panel env
> Hostinger. Jangan upload file `.env*` ke server.

### E. Install + Build + Start
Dari panel Node.js:
1. Jalankan `npm ci` dari terminal application root agar versi sesuai lockfile; sertakan folder `vendor/` dalam upload.
2. **Run NPM Script** → `build` → tunggu sampai muncul "Compiled
   successfully" + daftar route.
3. **Start App**.

### F. Setup database (sekali saja)
Buka SSH terminal Hostinger (hPanel → Advanced → SSH Access). `cd` ke
application root, lalu:
```bash
node scripts/setup-db.mjs
```
Script ini bikin database (kalau belum ada), apply semua migrasi
(iterasi 4, 7, 9), seed (desa, dummy, posts, tim_se), dan bikin user
admin awal. Idempotent — boleh dijalankan ulang.

`BOOTSTRAP_ADMIN_PASSWORD` harus terisi sebelum menjalankan skrip. Akun yang
sudah ada tidak diubah password atau role-nya oleh bootstrap. Gunakan fitur
pengelolaan pengguna untuk perubahan akun; password tidak ditulis ke log.

### G. Test
Buka `https://sensus.bpskabmusirawas.com/se/2026` — beranda muncul dengan
navbar oren, peta choropleth, footer oren.

Login: `https://sensus.bpskabmusirawas.com/se/2026/login`
- NIP: `admin`
- Password: yang kamu set di `BOOTSTRAP_ADMIN_PASSWORD`

### H. Update versi berikutnya
Saat ada perubahan code:
1. `git add -A && git commit -m "..."` di lokal.
2. `git archive --format=zip --output=se2026-deploy.zip HEAD`.
3. Upload zip baru ke Hostinger, **Extract & Overwrite**.
4. Jalankan `npm ci` dan `npm run security:check` → Run script `build` →
   Restart App.

### Pemeriksaan keamanan sebelum rollout

- Baca `security/security-review.md` untuk temuan, batas pengujian, dan hasil audit terbaru.
- `npm run security:check` menjalankan tes keamanan, regresi plugin lint, dan
  audit npm lengkap termasuk dependency development. Seluruh cabang minimatch
  kini dikunci ke **11.0.4**, sedangkan ESLint adalah paket berbeda pada versi
  **10.14.0**. Sertakan seluruh `vendor/` saat deployment; tiga arsip plugin
  lint berisi penyesuaian API yang dijelaskan di `vendor/README.md`.
  Cocokkan hasil scan hosting dengan lockfile dan deployment terbaru.
- Pasang batas body, timeout, dan rate limit login pada reverse proxy hosting.
  API import Excel membatasi file 20MB, arsip setelah ekstraksi 100MB/2048 entri;
  upload gambar 8MB/24 juta piksel; API eksternal JSON 4MB.
- Image Optimization dinonaktifkan sementara melalui `images.unoptimized`.
  Gambar disajikan langsung; aktifkan kembali hanya setelah patch SVG optimizer
  dari vendor diverifikasi dan endpoint diuji ulang. Pemilik: maintainer aplikasi.
- Simpan artefak lama untuk investigasi/rollback, tetapi jangan mengaktifkan
  kembali versi rentan. Jika perlu rollback kode, pertahankan dependensi patched
  dan kontrol akses yang sudah diperbaiki.
- Setelah rollout, ganti semua worker lama dan verifikasi `process.versions`,
  versi Next/Auth.js/sharp, HTTPS, cookie, serta alur login/import dengan DB staging.
