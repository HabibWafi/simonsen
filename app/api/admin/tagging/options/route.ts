import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { getActiveTaggingBatch } from '@/lib/tagging/query'

export async function GET(req: NextRequest) {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard
  const batch = await getActiveTaggingBatch()
  if (!batch) return NextResponse.json({ kecamatan: [], desa: [], sls: [], subsls: [], statuses: [] })
  const url = new URL(req.url)
  const kdkec = url.searchParams.get('kdkec')?.trim()
  const kddesa = url.searchParams.get('kddesa')?.trim()
  const idsls = url.searchParams.get('idsls')?.trim()
  const batchId = Number(batch.id)

  const [kecResult, desaResult, slsResult, subslsResult, statusResult] = await Promise.all([
    pool.execute(`SELECT kdkec code, COALESCE(MAX(nmkec),'Tidak terpetakan') name, COUNT(*) total
      FROM tagging_assignment WHERE batch_id=? GROUP BY kdkec ORDER BY name`, [batchId]),
    kdkec ? pool.execute(`SELECT kddesa code, COALESCE(MAX(nmdesa),'Tidak terpetakan') name, COUNT(*) total
      FROM tagging_assignment WHERE batch_id=? AND kdkec=? GROUP BY kddesa ORDER BY name`, [batchId, kdkec]) : Promise.resolve([[], []]),
    kddesa ? pool.execute(`SELECT idsls code, COALESCE(MAX(nmsls),CONCAT('SLS ',RIGHT(idsls,4))) name, COUNT(*) total
      FROM tagging_assignment WHERE batch_id=? AND kddesa=? GROUP BY idsls ORDER BY name`, [batchId, kddesa]) : Promise.resolve([[], []]),
    idsls ? pool.execute(`SELECT idsubsls code, CONCAT('Sub-SLS ',RIGHT(idsubsls,2)) name, COUNT(*) total
      FROM tagging_assignment WHERE batch_id=? AND idsls=? GROUP BY idsubsls ORDER BY code`, [batchId, idsls]) : Promise.resolve([[], []]),
    pool.execute(`SELECT status_alias code, COUNT(*) total FROM tagging_assignment WHERE batch_id=? GROUP BY status_alias ORDER BY total DESC`, [batchId]),
  ])
  return NextResponse.json({
    kecamatan: kecResult[0], desa: desaResult[0], sls: slsResult[0], subsls: subslsResult[0], statuses: statusResult[0],
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
