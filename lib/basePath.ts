/**
 * Helper untuk URL absolute yang TIDAK otomatis di-prefix oleh Next.js basePath.
 *
 * Next.js otomatis prefix:
 *  - <Link href="...">         ✓
 *  - <Image src="...">          ✓
 *  - router.push('...')         ✓
 *  - fetch('/api/...')          ✓ (server-side route handlers)
 *
 * Yang TIDAK otomatis (perlu helper ini):
 *  - <img src="..."> raw
 *  - background-image url() di style inline
 *  - URL untuk fetch dari client-side (jika ke API route)
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function withBase(p: string): string {
  if (!p) return p
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  if (!p.startsWith('/')) return p
  // Hindari double-prefix kalau path sudah dimulai dengan BASE_PATH
  if (BASE_PATH && p.startsWith(BASE_PATH + '/')) return p
  return `${BASE_PATH}${p}`
}
