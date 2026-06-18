/**
 * Generate favicon set dari public/images/logo-bps.png ke app/.
 *
 * Output:
 *   app/icon.png       (192x192) — PWA-style
 *   app/apple-icon.png (180x180) — Apple touch
 *   app/favicon.ico    (32x32 PNG di-rename .ico) — modern browser tab
 *
 * Catatan: Next.js App Router otomatis pickup file ini di /app/ root.
 * favicon.ico kita pakai PNG biar tidak perlu library ICO encoder —
 * browser modern menerima PNG dengan ekstensi .ico via Content-Type sniff.
 */
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = resolve('public/images/logo-bps.png')

async function main() {
  if (!existsSync(SOURCE)) {
    console.error('✗ logo-bps.png tidak ditemukan di public/images/')
    process.exit(1)
  }

  await sharp(SOURCE).resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(resolve('app/icon.png'))
  console.log('✓ app/icon.png (192x192)')

  await sharp(SOURCE).resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(resolve('app/apple-icon.png'))
  console.log('✓ app/apple-icon.png (180x180)')

  await sharp(SOURCE).resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(resolve('app/favicon.ico'))
  console.log('✓ app/favicon.ico (32x32 PNG, served as ico)')

  console.log('\nSelesai. Restart dev server untuk lihat icon baru di tab browser.')
}

main().catch(e => { console.error(e); process.exit(1) })
