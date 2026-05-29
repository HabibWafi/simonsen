import { NextResponse } from 'next/server'

let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  /* Return cached data if still fresh */
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=300' },
    })
  }

  try {
    const res = await fetch(`${process.env.GC_API_BASE}/usaha`, {
      headers: { Authorization: `Bearer ${process.env.GC_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`GC API returned ${res.status}`)

    const data = await res.json()
    cache = { data, ts: Date.now() }

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=300' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'GC API unavailable', message: e.message }, { status: 502 })
  }
}
