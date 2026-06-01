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

### Dev lokal
```bash
npm install
npm run dev
# → http://localhost:3000
```

### Build production
```bash
# Set env, build, run
export NEXT_PUBLIC_BASE_PATH=/se/2026
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
- **Node.js version**: 20 atau 22.

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
| `BOOTSTRAP_ADMIN_PASSWORD` | (password admin awal yang kuat) |

> ⚠️ `.env-production` **tidak ikut** di ZIP — secret-nya cukup di panel env
> Hostinger. Jangan upload file `.env*` ke server.

### E. Install + Build + Start
Dari panel Node.js:
1. **Run NPM Install** → tunggu selesai (1–3 menit).
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
4. Run NPM Install (kalau `package.json` berubah) → Run script `build` →
   Restart App.
