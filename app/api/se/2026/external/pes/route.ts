import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireApiToken, checkRateLimit, logAudit } from '@/lib/api-guard'
import { readJson, RequestBodyError } from '@/lib/request-body'
import { pesPayloadSchema } from '@/lib/pes/domain'
import { ingestPes, PesConflict } from '@/lib/pes/store'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = await requireApiToken(req, 'se', 2026, 'write:pes')
  if (token instanceof NextResponse) return token
  const started = Date.now()
  const respond = async (body: object, status: number) => {
    await logAudit({ tokenId: token.id, sensus: 'se', tahun: 2026, method: 'POST', path: req.nextUrl.pathname, status, req, durationMs: Date.now() - started })
    return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  }
  if (!checkRateLimit(`tok_${token.id}`).ok) return respond({ error: 'Terlalu banyak request; coba kembali dalam satu menit' }, 429)
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type') || '')) return respond({ error: 'Gunakan Content-Type application/json' }, 415)
  try {
    const parsed = pesPayloadSchema.safeParse(await readJson(req))
    if (!parsed.success) return respond({ error: 'Payload PES tidak valid', issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) }, 400)
    if (Date.parse(parsed.data.snapshot_ts) > Date.now() + 300_000) return respond({ error: 'Waktu sumber melebihi waktu sekarang lebih dari lima menit' }, 400)
    return respond({ ok: true, ...await ingestPes(pool, parsed.data, token.id) }, 200)
  } catch (error) {
    if (error instanceof RequestBodyError) return respond({ error: error.message }, error.status)
    if (error instanceof PesConflict) return respond({ error: error.message }, 409)
    console.error('[pes] ingest gagal', (error as { code?: string }).code || 'UNKNOWN')
    return respond({ error: 'Penyimpanan PES belum tersedia; kiriman tidak diterapkan' }, 503)
  }
}
