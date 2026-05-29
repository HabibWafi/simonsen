/**
 * GET /api/se/2026/public/progress?skala=UMK
 * Anonymous read-only — TIDAK butuh token.
 * Cached 60 detik. Cocok untuk frontend web atau widget eksternal.
 */
import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  // Delegate ke /api/progress (sumber kebenaran). Re-export shape sama.
  const url = new URL(req.url)
  const skala = url.searchParams.get('skala') ?? ''
  const upstream = await fetch(new URL(`/api/progress${skala ? `?skala=${skala}` : ''}`, req.url), {
    next: { revalidate: 60 },
  })
  const data = await upstream.json()
  await logAudit({ tokenId: null, sensus: 'se', tahun: 2026, method: 'GET', path: req.nextUrl.pathname, status: upstream.status, req })
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
