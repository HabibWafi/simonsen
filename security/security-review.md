# Security review

Pembaruan terakhir: **5 November 2026**. Hasil audit 15 moderate dan keberadaan minimatch 3 di bawah adalah catatan historis. Tindak lanjut terbaru memigrasikan seluruh cabang minimatch ke **11.0.4**; lihat bagian migrasi toolchain di akhir laporan.

Tanggal/zona waktu: 4 November 2026, Asia/Jakarta.
Mode: existing; pemeriksaan dan perbaikan lokal repository `simonsen`.
Baseline: commit `4acc7d976634e3c7cc12704942b9cc242d21ddb8`, working tree bersih sebelum audit.
Artefak yang dinilai: perubahan working tree setelah baseline tersebut dan lockfile hasil pembaruan.
SHA-256 lockfile audit awal: `f10bed2b424ee858926d69d4dfcae92b2e9704a4173f8ee25cadd467c030282c`.
Build standalone audit awal: `NFevQ45RtLtRJVeZsEbBw`; smoke 9/9 lulus setelah instalasi bersih dan build audit awal.
Status pengembangan lokal: **READY_FOR_DEVELOPMENT**.
Status rilis produksi: **NEEDS_EVIDENCE**; belum ada rollout atau pemeriksaan proses produksi.

## Bukti dan cakupan

- Satu aplikasi Next.js App Router, Auth.js Credentials/JWT, MySQL, parser Excel, upload gambar sharp, dan skrip setup/import Node.js.
- File PHP, Composer, Docker image, CI deployment, dan worker terpisah tidak ditemukan pada file tracked. Aturan PHP2Shell/session PHP **NOT_APPLICABLE untuk source repo ini**; hal ini tidak menginventaris seluruh akun hosting.
- CLI lokal: Node.js **24.22.1**, OpenSSL **3.5.9**, Brotli **1.2.0**, Undici **7.30.1**. Lini 24 masih didukung pada tanggal audit menurut [jadwal Node.js](https://github.com/nodejs/Release#release-schedule). Rilis lokal memuat patch Oktober, termasuk CVE-2026-111497, menurut [catatan rilis 24.22.1](https://nodejs.org/en/blog/release/v24.22.1).
- Tidak ditemukan pemanggilan Brotli langsung; `fetch` dan library HTTP tetap dapat mendekompresi respons upstream. Ketiadaan pemanggilan langsung tidak dipakai untuk menyatakan semua jalur decoder tidak berlaku. [Advisori Node.js Oktober](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) mencakup decoder, DNS/TLS, koneksi HTTP, dan snapshot entropy.
- Deklarasi runtime sebelumnya kosong; panduan lama menyebut Node 20/22. Sekarang `engines` mensyaratkan Node 24 >=24.22.1 <25; `.nvmrc`/`.node-version` memilih versi yang diuji; `.npmrc` menegakkan engine saat instalasi.
- Tidak ada kredensial DB/deployment yang digunakan. Tes DB dan sesi memakai stub; binary sharp dan parser workbook dijalankan sungguhan. Tidak dilakukan scanning server pihak ketiga, payload eksploit, atau percobaan OOM.
- Panduan Next.js yang dibaca dari `node_modules/next/dist/docs/`: Route Handlers, authentication/otorisasi, proxy, image configuration, self-hosting, dan upgrade versi 16.
- `npm` tidak tersedia di PATH shell. Pemeriksaan memakai npm CLI **12.2.1** dari paket registry resmi di direktori sementara, dengan Node lokal. Ini bukan perubahan instalasi global.

## Dependensi sebelum dan sesudah

| Komponen | Baseline | Versi terpasang setelah perbaikan |
| --- | --- | --- |
| Next.js / eslint-config-next | 16.2.10 | 16.4.5 |
| next-auth / @auth/core | beta.31 / 0.41.2 | beta.32 / 0.41.3 |
| sharp | 0.34.5 | 0.35.5 |
| mysql2 | 3.22.3 | 3.24.6 |
| zod | 4.4.3 | 4.6.7 |
| SheetJS xlsx | 0.18.5 | 0.20.3, tarball resmi dalam `vendor/` |
| yauzl, validator arsip baru | tidak ada | 3.4.0 |
| minimatch pada typescript-estree | 10.2.5, lalu resolver memilih 10.2.6 | 11.0.4, override terbatas pada parent tersebut |
| minimatch pada plugin lint legacy | 3.1.5 | 3.1.5; lihat penilaian terpisah di bawah |

Lockfile dipertahankan dan dependency transitif yang kompatibel diperbarui lewat `npm audit fix --ignore-scripts`, tanpa `--force`. PostCSS override dinaikkan ke ^8.5.32. Tidak dilakukan perpindahan major Next.js/Auth.js atau downgrade ESLint otomatis.

SheetJS: [dokumentasi distribusi vendor](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) menjelaskan bahwa registry npm tertinggal. Tarball diambil dari `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, disimpan untuk instalasi reproducible, dan dikunci melalui integrity lockfile. SHA-256 lokal: `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8` (fingerprint artefak, bukan tanda tangan independen vendor).

## Temuan dan perbaikan

| ID | Bukti/lokasi | Risiko dan prasyarat | Perbaikan / status lokal |
| --- | --- | --- | --- |
| SEC-01 | `package.json`, `package-lock.json` | Dependensi baseline memiliki advisory RCE, auth, parser, dan DoS. Keberadaan paket terdampak cukup untuk pembaruan; tidak semua prasyarat eksploit direproduksi. | Versi diperbarui, audit produksi 0; **fixed untuk advisory paket yang dilaporkan baseline**. [Next SVG RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Auth.js fail-open](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-8fpg-xm3f-6cx3), [sharp 0.35.5](https://github.com/lovell/sharp/releases/tag/v0.35.5). |
| SEC-02 | `app/api/laporan/route.ts:8`, `:37` | **Tinggi**: POST sebelumnya tanpa login dan menerima `user_id` dari request, memungkinkan pemalsuan pengirim serta perubahan statistik. | Wajib sesi valid, ID dari akun aktif, schema data, angka non-negatif, body 64KiB, dan pemeriksaan wilayah petugas. Tes anonim 401, pemalsuan ID diabaikan, angka negatif 400; **fixed**. |
| SEC-03 | `app/api/usaha/route.ts:24` | **Tinggi**: petugas tanpa `kdkec` melewati filter wilayah dan dapat membaca semua usaha. | Akses ditolak 403 jika penugasan kosong; petugas berwilayah tetap dipaksa memakai wilayah akunnya; **fixed**. |
| SEC-04 | `lib/auth-guard.ts:40` | **Tinggi**: JWT berlaku 30 hari; akun dihapus/diturunkan rolenya masih menggunakan hak lama pada guard. | Guard membaca akun/role/wilayah terkini dari DB; akun hilang ditolak. Proxy juga memerlukan `session.user`, bukan keberadaan objek auth saja. Uji role diturunkan/deleted lulus; **fixed pada guard server**. |
| SEC-05 | `lib/auth-guard.ts:15`, pemanggil mutasi admin | **Sedang**: endpoint mutasi sesi tidak memvalidasi origin sendiri. | Semua mutasi admin meneruskan request ke guard; origin lintas situs ditolak, menggunakan origin `NEXTAUTH_URL` bila tersedia. Endpoint laporan memakai kontrol yang sama. Klien non-browser tanpa Origin masih wajib sesi. Tes cross-origin 403 sebelum DB; **fixed**. |
| SEC-06 | `lib/request-body.ts`, `lib/excel/upload.ts`, tiga route import Excel, dua API eksternal | **Sedang**: pembacaan multipart/JSON tidak dibatasi sebelum buffering; file terkompresi dapat mengembang jauh lebih besar dari upload. | Batas byte stream aktual termasuk tanpa Content-Length; request encoding selain identity ditolak. XLSX 20MiB + overhead form 64KiB, arsip 100MiB/2048 entri, ukuran dekompresi aktual diperiksa sebelum parsing. File non-XLSX ditolak. JSON eksternal 4MiB. Tes batas stream dan arsip jinak lulus; **fixed untuk jalur tersebut**. Bukan jaminan kapasitas global atau pengganti batas proxy/konkurensi. |
| SEC-07 | `app/api/admin/upload/route.ts:42` | **Sedang**: MIME berasal dari klien; gambar berukuran piksel besar atau SVG tersamar dapat mencapai decoder. | Body dibatasi sebelum parsing, file 8MiB, signature JPEG/PNG/WebP diperiksa sebelum sharp, maksimal 24 juta piksel, hasil deteksi hanya JPEG/PNG/WebP statis, hasil selalu WebP. sharp patched. Tes SVG tersamar ditolak dan re-encode PNG lulus; **fixed**. |
| SEC-08 | `scripts/create-admin.mjs:25`, `scripts/setup-db.mjs:35`, `scripts/bootstrap-password.mjs:1` | **Tinggi**: fallback password admin yang diketahui publik, password dicetak ke log, bootstrap ulang mereset role/password akun existing. | Password eksplisit minimal 12 karakter/maksimal 72 byte UTF-8; tanpa fallback/log password; duplicate NIP tidak mengubah akun. Tes validasi password lulus; **fixed untuk eksekusi berikutnya**. Akun dan log lama di produksi belum diperiksa. |
| SEC-09 | `components/KecamatanTooltip.tsx:10` | **Sedang**, kondisional: nama wilayah dari data dimasukkan ke HTML tooltip Leaflet tanpa escaping. | Escape karakter HTML sebelum membentuk tooltip. React rendering biasa tetap menggunakan escaping React. Tes teks markup lulus; **fixed**. |
| SEC-10 | `lib/csv.ts:2`, `lib/exportTable.ts` | **Sedang**, memerlukan ekspor dibuka di spreadsheet: teks nama/data yang menyerupai formula bisa dievaluasi. | Awalan formula/control pada teks diperlakukan sebagai teks; quoting CSV menangani CR/LF/quote. Nilai number tetap number. Tes formula-like/CSV lulus; **fixed**. |
| SEC-11 | `lib/auth.ts`, `lib/validators/user.ts` | **Rendah–sedang**: tipe kredensial tidak diperiksa sebelum bcrypt dan password >72 byte terpotong oleh bcrypt. | Validasi tipe/panjang kredensial login, batas byte UTF-8 untuk pembuatan/update password. Password lama >72 byte perlu reset oleh admin, tanpa truncation diam-diam; **fixed untuk input berikutnya**. |
| SEC-12 | `next.config.ts:7` | Advisory baru [SVG rejection bypass](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2) belum mencantumkan patch pada halaman vendor saat diperiksa. | Image optimizer dinonaktifkan (`unoptimized: true`), gambar disajikan langsung. **Mitigasi jalur**, tidak menyatakan advisory patched. Pemilik maintainer; cabut kontrol hanya setelah patch vendor dan verifikasi endpoint. |

## Advisory tambahan yang dinilai

- [Cross-client response forwarding](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385): memerlukan forwarding respons fetch utuh dan reverse proxy dengan perilaku tertentu. Source API mengurai JSON dan membuat respons baru; tidak ditemukan forwarding respons upstream utuh. **NOT_APPLICABLE pada jalur source yang diperiksa**, konfigurasi proxy produksi tetap belum diperiksa.
- [Fallback shell Cache Components](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf), [binary argument cache](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj), dan [unstable_cache/root params](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h): tidak ditemukan `cacheComponents`, `use cache`, `unstable_cache`, atau root-params di source. **NOT_APPLICABLE pada konfigurasi source ini**; evaluasi ulang jika fitur cache tersebut ditambahkan.
- [Delayed inner-stream cache metadata](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8): vendor mencantumkan patch 16.4.2; versi 16.4.5 terpasang, fitur terkait juga tidak digunakan.
- [Edge cookie header exposure](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2): tidak ditemukan route Edge runtime. Proxy Next.js 16 menggunakan Node.js. **NOT_APPLICABLE pada route yang diperiksa**.
- [next/og RCE](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j): versi diperbarui melewati 16.3.6; source tidak memakai `ImageResponse` dengan input SVG tidak tepercaya.

## Sisa hasil scanner alat pengembangan

Audit awal semua dependency: **29** (3 critical, 8 high, 18 moderate).
Audit akhir produksi (`npm audit --omit=dev`): **0**.
Audit akhir lengkap (`npm audit`): **15 moderate**, seluruhnya rantai lint yang bergantung pada `minimatch@3.1.5`.

[Advisori maintainer minimatch](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) menyebut versi 10.2.6 dan preprocessing dengan `optimizationLevel >= 2`; metadata registry memakai rentang lebih luas `<11.0.1`. Cabang modern pada typescript-estree sudah diganti 11.0.4. Inspeksi `node_modules/minimatch/minimatch.js` versi 3.1.5 tidak menemukan `firstPhasePreProcess` atau `optimizationLevel`: **inferensi statis NOT_APPLICABLE untuk mekanisme advisory tersebut**, bukan penghapusan/suppression temuan scanner atau jaminan seluruh risiko minimatch lama. Jangan memaksa versi 11 pada pemanggil legacy yang memakai API callable versi 3. Hasil lint dengan override modern berhasil dianalisis tanpa crash/API error.

ESLint 9.39.5 mengeluarkan peringatan bahwa lini 9 sudah tidak didukung. Pemeliharaan berikutnya perlu migrasi lint/plugin ke versi yang didukung dan kompatibel. Perubahan major plugin tidak dipaksakan dalam perbaikan runtime/aplikasi ini. Status toolchain jangka panjang: **NEEDS_REMEDIATION (maintenance)**, terpisah dari 0 temuan scanner produksi.

## Perubahan dan pengujian

- `npm ci --ignore-scripts`: baseline terpasang; audit awal tersimpan sementara di luar repository.
- `npm ci --ignore-scripts --no-audit` setelah pembaruan: **lulus**, memasang ulang 429 paket dari lockfile/vendor; seluruh 16 tes dan build diulang sesudah instalasi bersih dan lulus.
- Instalasi versi patched dan pembaruan lockfile selesai; SheetJS, sharp, yauzl benar-benar dapat dijalankan pada mesin Windows ini.
- `npm run test:security` (perintah node ekuivalen): **16/16 lulus**. Mencakup pemalsuan identitas, perubahan role, akun dihapus, scope petugas kosong, seluruh handler mutasi admin menolak origin lintas situs sebelum DB, input numerik, pembatasan stream, arsip, MIME, tooltip, CSV, dan bootstrap.
- `node node_modules/typescript/bin/tsc --noEmit`: **lulus**.
- `next build --webpack`: **lulus**, termasuk TypeScript dan generate 64 halaman. Build memakai fallback tanpa DB; peringatan DB bukan pengujian keberhasilan koneksi database.
- Lint helper/test baru: **lulus tanpa warning**. Lint seluruh repo: **429 error/36 warning** yang masih perlu perapian; pemeriksaan awal menghasilkan 431 error/36 warning. Perbandingan `lintText` terhadap isi `HEAD` pada 35 file berubah: 118 error sebelum, 116 sesudah, **0 pesan lint baru**. Ini bukan klaim bahwa lint seluruh repo bersih.
- `git diff --check`: **lulus**.
- Smoke HTTP standalone (`tests/security-smoke.mjs`): **9/9 lulus**. Beranda/session 200, POST laporan anonim 401/lintas origin 403, daftar usaha/import admin tanpa sesi 401, API eksternal tanpa token 401, optimizer 404, dashboard anonim redirect 307. Tidak muncul header internal cookie. Hanya bind loopback, secret sementara, tidak memakai DB/akun nyata; server tes dihentikan setelah selesai.
- Checklist React diterapkan untuk perubahan escaping tooltip dan petunjuk upload `.xlsx`/20MB; tidak menambah hook/effect atau mengubah alur rendering data.

## Deployment, rollback, dan batas bukti

Produksi tidak diubah. Tidak ada commit/push, migrasi DB, restart hosting, atau rotasi secret yang dilakukan.

Sebelum release, penanggung jawab aplikasi/hosting perlu:

1. Memastikan runtime efektif semua worker/replica memakai versi Node supported yang patched, termasuk binary/distributor backport bila relevan; verifikasi dependency native sharp/libvips pada image Linux yang benar.
2. Menyiapkan DB staging dan secret runtime, menguji login, penurunan role, import, penyimpanan laporan, dan upload valid dengan akun nyata; verifikasi HTTPS dan cookie. Stub unit test tidak membuktikan skema SQL serta otorisasi seluruh tenant produksi.
3. Memeriksa akun yang pernah dibuat dengan password bawaan dan log lama yang mungkin berisi password, kemudian mengganti kredensial lewat kanal admin tepercaya bila perlu. Perubahan repo tidak menghapus kredensial/log lama.
4. Mengonfigurasi batas ukuran request, timeout, rate limit login, dan kapasitas/konkurensi di reverse proxy. Limiter API token existing bersifat in-memory per proses dan bukan jaminan pembatasan gabungan semua replica.
5. Menjalankan `npm ci`, tes keamanan, audit produksi, dan build dengan lockfile ini; menyertakan `vendor/` saat upload; mengganti seluruh worker lama dan memeriksa hasil smoke setelah rollout.
6. Mempertahankan artefak baseline untuk referensi pemulihan; jangan mengaktifkan ulang versi rentan saat rollback. Rollback kode harus tetap membawa patch dependency dan kontrol otorisasi. Tidak ada migrasi skema dalam perubahan ini.

Pemeriksaan ini tidak membaca log/host produksi, tidak menilai indikasi kompromi aktual, tidak mengaudit semua isi data/database, dan tidak menyatakan semua ancaman dicegah. Pengembangan lokal dapat dilanjutkan. Clearance produksi menunggu bukti proses deployment dan pengujian DB nyata; hasil audit npm bersih hanya berlaku untuk dependency produksi yang diketahui registry pada tanggal ini.

## Tindak lanjut build Hostinger

Log build `01a1a77b-03fc-708b-851a-4a09544f499d` dari pengguna menunjukkan commit `a8fd7aa` berhasil dikompilasi, tetapi gagal type-check karena `@types/yauzl` tidak terpasang. Pemeriksaan audit awal memasang dependency development sehingga kondisi instalasi produksi yang menghilangkan paket tipe ini belum tercakup.

`@types/yauzl` dipindahkan dari `devDependencies` ke `dependencies`, dan flag `dev` pada entri lockfile dihapus. Versi paket dan validasi tipe aplikasi dipertahankan. Dokumentasi deployment menambahkan pemeriksaan instalasi tanpa paket development.

Verifikasi lokal setelah perbaikan: `npm prune --omit=dev --ignore-scripts --no-audit` menghapus seluruh tool lint development; `@types/yauzl@3.4.0`, `yauzl@3.4.0`, dan TypeScript tetap terpasang. `next build --webpack` **lulus sampai selesai**, termasuk type-check dan pembuatan standalone, dalam kondisi ini. Seluruh **16 tes keamanan lulus** dan `npm audit --omit=dev` melaporkan **0 kerentanan**. SHA-256 lockfile perbaikan: `3d74671f473ec1aa3e538ebc6faf46020ba7d7b55efeb1e29f4fe5bd7ea515e0`. Keberhasilan redeploy Hostinger berikutnya masih perlu diverifikasi dari log hosting.

### Batas worker build — 5 November 2026

Log Hostinger `01a1a781-596d-71d9-a9d1-06e38cbf99ec` untuk commit `6a5c085` mengonfirmasi type-check sudah berhasil. Kegagalan berikutnya terjadi ketika pengumpulan data halaman membuat **63 worker**, diikuti panic Tokio `OS can't spawn worker thread` / EAGAIN dan SIGABRT. Log membuktikan kegagalan alokasi thread; nilai kuota PID/thread dan memori hosting belum tersedia.

Inspeksi Next.js 16.4.5 lokal (`dist/server/config-shared.js` dan `dist/build/index.js:getNumberOfWorkers`) menunjukkan default menggunakan jumlah CPU terlihat dikurangi satu, sedangkan `experimental.cpus` dapat membatasi pool worker secara eksplisit. Konfigurasi proyek sekarang menetapkan `experimental: { cpus: 1 }`, mengurangi proses build yang masing-masing dapat memuat runtime native/thread pool sendiri. Ini kontrol penggunaan resource build, bukan patch kerentanan atau perubahan kuota hosting.

Verifikasi: build lokal dijalankan dengan `CIRCLE_NODE_TOTAL=64` untuk mensimulasikan dasar perhitungan default 63 worker pada versi ini. Output aktual menampilkan `Collecting page data using 1 worker` dan `Generating static pages using 1 worker (64/64)`; kompilasi, TypeScript, dan pengemasan standalone **lulus sampai selesai**. Simulasi ini tidak mereproduksi kuota thread Linux Hostinger. Jika build hosting tetap gagal dengan satu worker, diperlukan bukti dan penyesuaian kuota dari penyedia hosting. Status keberhasilan deployment tetap menunggu log build berikutnya.

## Verifikasi ulang CVE-2026-118764 — 5 November 2026, Asia/Jakarta

Mode: existing, pemeriksaan terfokus pada laporan Hostinger untuk `minimatch@3.1.5`. Baseline source: `14ad6e4f4daecaa2850fd8536bbc49ab2a1ab440`. SHA-256 lockfile tetap `3d74671f473ec1aa3e538ebc6faf46020ba7d7b55efeb1e29f4fe5bd7ea515e0`.

### Bukti terkini dan keputusan temuan

- Tangkapan layar pengguna mencantumkan rentang lama `<11.0.1`. [GitHub Advisory Database GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), diperbarui **4 November 2026**, sekarang mencantumkan rentang terdampak **`>=7.0.0 <11.0.1`** dan patched **11.0.1**. Halaman tersebut diperiksa kembali pada 5 November 2026.
- [Advisori maintainer](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) menjelaskan amplifikasi `globParts` pada preprocessing `optimizationLevel >= 2`. Perbedaan rentang metadata lama menjelaskan hasil scanner awal; hasil sekarang didasarkan pada rentang resmi yang sudah dikoreksi.
- `package-lock.json` dan `npm ls minimatch --all` menunjukkan dua versi, keduanya dependency development: **3.1.5** pada rantai ESLint/plugin React/import/accessibility, dan **11.0.4** pada `@typescript-eslint/typescript-estree` melalui override yang sudah ada. Tidak ditemukan versi 7 sampai 11.0.0 pada lockfile.
- Keputusan untuk **CVE ini pada dependency source yang diperiksa: NOT_APPLICABLE**. Versi 3.1.5 berada di luar rentang terdampak terbaru; versi 11.0.4 sudah melewati versi perbaikan. Peringatan di tangkapan layar konsisten dengan pemetaan advisori lama. Database scanner dan instalasi aktif Hostinger belum dapat dibaca langsung, sehingga hilangnya peringatan hosting belum terverifikasi.
- Versi 3 dan 11 memakai bentuk ekspor yang berbeda. Tidak dilakukan override major menyeluruh pada pemanggil legacy hanya untuk menyembunyikan peringatan. Dukungan ESLint 9 tetap merupakan pekerjaan pemeliharaan terpisah sebagaimana dicatat di atas; keputusan CVE ini tidak menutup risiko toolchain lain.

### Perubahan dan hasil pemeriksaan

- `security:check` sekarang menjalankan `npm audit --include=dev` agar pemeriksaan mencakup alat lint development juga. Tidak ada advisory yang diabaikan dan tidak ada pembaruan versi atau perubahan lockfile pada tindak lanjut ini.
- `npm audit --include=dev --json`: exit **0**, **0** kerentanan; metadata mencakup 119 production, 329 development, dan 87 optional (kategori dapat beririsan, total metadata 511).
- `npm audit --omit=dev --json`: exit **0**, **0** kerentanan.
- `npm run security:check`: **lulus**, 16/16 tes keamanan dan audit lengkap 0. `npm run test:schedule`: **lulus**, 6/6 tes. Npm CLI resmi sementara digunakan dengan wrapper PATH sementara untuk pemanggilan npm bersarang; percobaan awal memakai wrapper bawaan paket gagal menemukan modul npm, lalu lingkungan CLI diperbaiki. Tidak ada perubahan instalasi global.
- `git diff --check`: **lulus**. Build aplikasi tidak diulang karena perubahan hanya perintah pemeriksaan dan dokumentasi, tanpa perubahan dependency atau kode aplikasi.

### Deployment dan batas verifikasi

Source siap diteruskan untuk cakupan tindak lanjut ini (**READY_FOR_DEVELOPMENT**); tidak diperlukan patch dependency tambahan untuk CVE-2026-118764 pada lockfile tersebut. Ini bukan klaim bahwa seluruh server bebas kerentanan. Commit dokumentasi/perintah pemeriksaan dapat mengikuti alur GitHub ke Hostinger yang telah diotorisasi pengguna; keberhasilan redeploy dan hasil scan hosting tetap **NEEDS_EVIDENCE** sampai log/status aktual tersedia.

Tindakan hosting: jalankan pemindaian ulang dengan basis advisori terbaru. Jika CVE yang sama tetap ditempelkan pada 3.1.5, berikan tautan advisori dan rentang terkoreksi tersebut kepada dukungan Hostinger untuk koreksi pemetaan. Tidak perlu rollback dependency atau menghapus paket secara manual dari server.

## Migrasi seluruh cabang minimatch ke 11.0.4 — 5 November 2026

Mode: existing; baseline `3a8d37f464b7f3023a58c279bc5d19b8cf5f77e1`. Pengguna meminta penggunaan minimatch versi terbaru setelah penjelasan perbedaan rentang CVE. Cakupan perubahan adalah dependency development dan kompatibilitas pemeriksaan kode, tanpa perubahan kode aplikasi atau versi dependency produksi.

### Sumber dan implementasi

- Registry npm resmi pada saat pemeriksaan mencantumkan minimatch **11.0.4** sebagai `latest` dan ESLint **10.14.0** sebagai `latest`. Angka major ini milik paket berbeda. `eslint-config-next@16.4.5` dan dokumentasi terpasangnya mendukung ESLint 10 pada Node 24 yang digunakan proyek.
- Panduan [migrasi ESLint 10](https://eslint.org/docs/latest/use/migrate-to-10.0.0) mencatat penghapusan API context/token lama. Konfigurasi proyek memakai [`@eslint/compat`](https://eslint.org/blog/2024/05/eslint-compatibility-utilities/) 2.1.1 untuk mempertahankan perilaku plugin. Aturan lint tidak dinonaktifkan.
- [Minimatch 11](https://github.com/isaacs/minimatch) menyediakan named export `minimatch` dan matcher non-regex; API pembentukan regex lama telah dihapus. Plugin React 7.37.5, import 2.32.0, dan jsx-a11y 6.10.2 masih merupakan rilis upstream terbaru saat diperiksa, tetapi meminta API callable minimatch 3.
- Tiga plugin disimpan sebagai distribusi lokal berlisensi asli dengan build metadata `+simonsen.N`. Penyesuaian mencakup named import, penggunaan `Minimatch.match()` pada pembatasan modul internal, serta pola path Windows pada pembatasan direktori. Seluruh dependensi minimatch di manifest plugin menjadi 11.0.4. Tidak ada kode minimatch lama yang dibungkus atau versi paket lama yang disamarkan.
- Skrip `scripts/vendor-eslint-plugins.mjs` mengunduh arsip upstream dengan versi tetap, memverifikasi SHA-512 sebelum ekstraksi, memeriksa jumlah penggantian source, dan membuat arsip tanpa lifecycle script. `vendor/README.md` memuat sumber, perubahan, langkah rebuild, serta syarat penghapusan patch saat upstream sudah mendukung API baru. Direct dev dependency memakai arsip root agar instalasi tidak bergantung pada override file relatif di dalam dependency transitif.
- Root override **`minimatch: 11.0.4`** mencakup ESLint, config-array, typescript-estree, dan seluruh plugin. Lockfile baru hanya memuat versi minimatch 11.0.4. `security:check` menyertakan 16 regresi toolchain sebelum audit npm lengkap.

### Verifikasi source yang telah dijalankan

- `npm ls minimatch --all`: seluruh cabang **11.0.4**, tanpa versi 3, 7, 9, atau 10. ESLint terpasang **10.14.0**.
- `node --test tests/lint-toolchain.test.mjs`: **16/16 lulus**, termasuk pola glob React, label aksesibilitas, cakupan dev dependency, urutan impor, allow/forbid modul internal, konstruktor matcher untuk pembatasan path, dan versi minimatch di seluruh lockfile.
- Perbandingan lint pada 161 file baseline: **416 error / 35 warning sebelum dan sesudah**, tanpa fatal error. Perbandingan rule, severity, pesan, baris, dan kolom juga tidak menemukan perubahan diagnostik. Ini temuan lint lama yang masih perlu dirapikan, bukan kegagalan load plugin setelah upgrade. Helper/test/config yang baru atau berubah lulus lint tanpa diagnostik.
- Perbandingan versi entri non-development pada lockfile: **tidak ada perubahan versi dependency produksi**. SHA-256 lockfile baru: `42237f52f9f9d80897120f1279797a29ef185682710d8046b38a0b344b59f5e3`.
- `npm ci --ignore-scripts --no-audit`: **lulus**, memasang 417 paket dari lockfile dan arsip vendor. Seluruh pemeriksaan berikut dijalankan kembali sesudah instalasi bersih ini.
- `npm run security:check`: **lulus**, 16 tes keamanan, 16 tes toolchain, dan audit lengkap **0 kerentanan**. `npm run test:schedule`: **6/6 lulus**. Total **38 tes lulus**.
- `npm run build`: **lulus**, termasuk kompilasi, TypeScript, 64 halaman dengan satu worker, dan pengemasan standalone. Build memakai fallback tanpa DB lokal, sehingga tidak memverifikasi CRUD database atau koneksi produksi.
- `git diff --check`: **lulus**. Tidak dilakukan payload eksploit, scanning produksi, migrasi DB, atau rotasi secret.

Pemeliharaan berikutnya harus menguji plugin lokal ini saat versi lint berubah; hapus arsip dan adapter ketika rilis upstream sudah mendukungnya dan tes kompatibilitas tetap lulus. Deployment otomatis mengikuti otorisasi GitHub/main sebelumnya. Status proses aktif serta hasil scanner Hostinger tetap **NEEDS_EVIDENCE** sampai bukti hosting tersedia; source yang diperbarui tidak membuktikan semua worker telah berganti.

## Monitoring PES SE2026 — 5 November 2026

Mode: existing, pemeriksaan terfokus pada integrasi baru PES; baseline main
`db68e47eb84fa5616fc8073e4211acd7f5de58a9`. Panduan Next.js yang terpasang
untuk Route Handlers, Client Components dan lazy loading dibaca sebelum implementasi.
Tidak ada perubahan dependency/runtime atau pengambilan data responden.

### Perlindungan dan kontrak data

- Endpoint POST memakai token SE2026 dengan scope `write:pes`, guard/audit dan
  limiter yang sudah ada. `write:progress` saja ditolak; scope `admin` tetap
  mengikuti aturan guard. Limiter berada dalam memori per proses, bukan global.
- Body aktual dibatasi 4 MiB, kompresi ditolak, Content-Type JSON wajib, batch
  dibatasi 6.000 kunci unik. Zod memvalidasi integer nonnegatif, batas terhadap
  assignment, urutan selesai pemeriksaan/pendataan, nama publik bukan email,
  serta waktu sumber tidak lebih dari lima menit di masa depan.
- SQL berparameter dan row lock dalam urutan kunci stabil menjaga transaksi
  metadata–rekap–riwayat. Hash payload mencegah replay; stale/conflict membatalkan
  semua baris. Pengalihan assignment dikirim sebagai kondisi absolut kedua petugas.
- UUID publik berbeda dari kunci sumber. SELECT publik menyebut kolom secara
  eksplisit; email/kunci sumber, hash, token dan informasi responden tidak dikirim.
  Error database hanya mengembalikan status belum tersedia, tanpa SQL mentah.
- Identitas, target dinamis dan riwayat harian WIB berada di tabel `pes_*` terpisah.
  Koreksi negatif dipertahankan; hari tanpa snapshot dan baseline tidak dihitung
  sebagai tambahan harian. Filter roster terkini konsisten di rekap dan riwayat.
- CSV memakai helper perlindungan formula yang sudah diuji; React melakukan
  escaping nama. Grafik dimuat terpisah dan polling hanya berjalan saat tab aktif,
  setiap 60 detik serta ketika kembali ke tab. Keadaan kosong/gagal tidak membuat
  angka contoh atau mengambil angka SE2026 utama.

### Pemeriksaan yang dijalankan

- `npm run security:check`: **43/43 tes lulus** (16 keamanan, 11 PES, 16
  toolchain); `npm audit --include=dev`: **0 kerentanan**.
- `npm run test:schedule`: **6/6 lulus**.
- `npm run test:pes:mysql`: **7/7 lulus** pada MySQL 8.4 disposable di loopback;
  mencakup migration dua kali, concurrent replay, pertumbuhan target, nol target,
  nama sama/ID berbeda, partial update, reassignment/koreksi, histori dan rollback
  stale row setelah baris lain sudah diubah. Tes memakai sentinel SE2026 yang tetap
  sama dan memeriksa tidak bocornya identitas sumber lewat API publik.
- Lint file PES baru/berubah: **0 diagnostik**. Build produksi menyelesaikan
  kompilasi, TypeScript, 67 halaman dengan satu worker, serta standalone.
- UI build produksi lokal: pencarian, filter pengawas/petugas, urutan target,
  ringkasan dan kedua mode grafik diperiksa dengan data sintetis. Validasi rentang
  di atas 90 hari ditolak. Layout 390 px tidak menambah overflow halaman; tabel
  menggunakan area scroll sendiri dan menu ponsel memuat PES setelah Progress.
- Kondisi kosong diuji dengan mengosongkan DB disposable; kondisi unavailable
  diuji dengan rename sementara tabel disposable lalu dipulihkan. UI menampilkan
  placeholder dan pesan yang sesuai. Tidak ada pengujian kegagalan di produksi.
- CSV hasil filter diperiksa: hanya petugas terpilih, angka sama dengan rekap.
  Pemeriksaan ekspor menemukan selector ikon legenda Recharts; selector PNG grafik
  diperbaiki menjadi SVG dengan role application agar mengambil plot utama.
  Sesudah rebuild, rentang 1–5 November diterapkan melalui UI; PNG kumulatif dan
  harian yang dihasilkan masing-masing berukuran **2334 × 620**, bukan ikon 28 × 28.
  CSV dan PNG tabel juga menghasilkan isi sesuai rekap. Browser lokal menyisakan
  unduhan pada file sementara `.crdownload`; yang diperiksa adalah isi/metadata
  hasil generasi, bukan klaim bahwa pengguna sudah menyelesaikan penyimpanan OS.

### Migrasi dan batas rilis

Migrasi additive `2026_se2026_pes.sql` diterapkan lewat sesi phpMyAdmin hPanel yang
sudah terautentikasi, pada database situs sebelum merge. Ketiga CREATE berhasil;
struktur menunjukkan `pes_snapshot`, `pes_petugas`, `pes_petugas_harian` masing-masing
0 baris. Tabel lain, token dan konfigurasi akses tidak diubah. Tidak ada data
sintetis yang dikirim ke produksi. `npm run db:migrate-pes` menyediakan penerapan
ulang idempotent dan kontrak scraper ada di `docs/api/pes-2026.md`.

Keputusan cakupan fitur: **READY_FOR_RELEASE** setelah build/check di atas.
Scraper belum dibuat/dihubungkan dan token produksi baru belum diterbitkan; data
nyata baru tersedia setelah integrasi itu dilakukan. Ketahanan lintas-replika
limiter, seluruh runtime hosting, serta pengiriman sumber nyata tetap di luar
bukti tes lokal ini. Hasil deploy dan akses halaman produksi harus diverifikasi
sesudah merge; audit npm bersih bukan bukti seluruh server bebas kerentanan.

### Verifikasi produksi dan navigasi tablet

PR #7 digabung sebagai `78f818dd457dc26b2f5c93bd57368dc4fc43fffb` dan auto
deploy Hostinger teramati. Pada 5 November 2026, halaman PES dan API publik
mengembalikan **200**, roster kosong, source null, dan header `no-store` pada API.
Rentang lebih dari 90 hari ditolak **400**; POST tanpa token ditolak **401**.
Halaman produksi menampilkan menunggu snapshot pertama dengan placeholder,
serta menu PES di navbar/footer. Tidak dilakukan penulisan snapshot produksi.

Pemeriksaan tambahan pada lebar 940 px menemukan navbar desktop melampaui layar
(scroll width 1005 px pada client width 925 px). Breakpoint navbar khusus SE2026
dinaikkan dari 900 ke 1100 px sehingga menu ponsel dipakai sebelum tujuh tautan
dan tombol login kehabisan ruang. Sensus lain tetap memakai breakpoint lama.
Perubahan ini hanya CSS responsif; lint komponen dan build produksi dijalankan ulang.
