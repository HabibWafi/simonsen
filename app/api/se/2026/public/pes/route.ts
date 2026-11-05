import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import pool from '@/lib/db'
import { pesRange } from '@/lib/pes/domain'
import { readPes } from '@/lib/pes/store'

const querySchema = z.object({ q: z.string().max(150).optional(), pengawas: z.string().max(150).optional(), petugas: z.uuid().optional() })
export async function GET(req: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const params = req.nextUrl.searchParams
    const filters = querySchema.safeParse({ q: params.get('q') || undefined, pengawas: params.get('pengawas') || undefined, petugas: params.get('petugas') || undefined })
    if (!filters.success) return NextResponse.json({ error: 'Filter PES tidak valid' }, { status: 400, headers })
    let range
    try { range = pesRange(params) } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400, headers }) }
    return NextResponse.json(await readPes(pool, range, filters.data), { headers })
  } catch (error) {
    console.error('[pes] pembacaan gagal', (error as { code?: string }).code || 'UNKNOWN')
    return NextResponse.json({ code: 'PES_UNAVAILABLE', error: 'Monitoring PES belum tersedia. Data belum dapat dimuat; coba kembali nanti.' }, { status: 503, headers })
  }
}
