/**
 * GET /api/se/2026/public/stats — read-only KPI, anonymous.
 */
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  const upstream = await fetch(new URL('/api/stats', req.url), { next: { revalidate: 60 } })
  const data = await upstream.json()
  await logAudit({ tokenId: null, sensus: 'se', tahun: 2026, method: 'GET', path: req.nextUrl.pathname, status: upstream.status, req })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
