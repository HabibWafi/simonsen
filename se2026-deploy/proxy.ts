/**
 * Next.js 16 proxy — guard semua sub-route dashboard per-sensus.
 * Pattern URL: /{kode}/{tahun}/dashboard/**
 * - tidak login → redirect ke /{kode}/{tahun}/login
 * - petugas di dashboard root → redirect ke .../dashboard/laporan
 *
 * Cek akses per-sensus (user_sensus_access) di-handle di tiap route handler/server
 * komponen agar middleware tetap ringan (tidak fetch DB di edge).
 */
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const path = req.nextUrl.pathname
  const session = req.auth

  const m = path.match(/^\/([a-z]{1,5})\/(\d{4})\/dashboard(?:\/(.*))?$/)
  if (!m) return NextResponse.next()

  const [, kode, tahun, sub] = m

  if (!session) {
    const loginUrl = new URL(`/${kode}/${tahun}/login`, req.url)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  const role = (session.user as any)?.role
  if (!sub && role === 'petugas') {
    return NextResponse.redirect(new URL(`/${kode}/${tahun}/dashboard/laporan`, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/:sensus/:tahun/dashboard/:path*'],
}
