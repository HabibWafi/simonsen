/**
 * POST /api/admin/import/fasih  (multipart: file=.xlsx hasil scraper Fasih)
 *
 * Fallback manual via dashboard. Parse 6 sheet → payload → ingestFasih (logika sama
 * dengan endpoint JSON external/fasih). Session guard admin/koordinator.
 */
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import pool from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'
import { ingestFasih, type FasihPayload } from '@/lib/fasih/ingest'

export const runtime = 'nodejs'

// nama sheet → level payload
const SHEET_MAP: Record<string, keyof FasihPayload> = {
  'Rekap Kecamatan': 'kecamatan',
  'Rekap Desa': 'desa',
  'Rekap SLS': 'sls',
  'Detail SUBSLS': 'subsls',
  'Progress Petugas': 'petugas',
  'Progress Pengawas': 'pengawas',
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File .xlsx tidak ditemukan' }, { status: 400 })
    }
    const buf = Buffer.from(await (file as File).arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })

    const payload: FasihPayload = {
      snapshot_ts: extractTs((file as File).name),
    }
    for (const sheetName of wb.SheetNames) {
      const level = SHEET_MAP[sheetName]
      if (!level) continue
      const ws = wb.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null }) as any[]
      ;(payload as any)[level] = rows
    }

    const hasAny = Object.keys(SHEET_MAP).some(s => {
      const lvl = SHEET_MAP[s]
      return Array.isArray((payload as any)[lvl]) && (payload as any)[lvl].length
    })
    if (!hasAny) {
      return NextResponse.json({ error: 'Tidak ada sheet Fasih yang dikenali (Rekap Kecamatan/Desa/SLS, Detail SUBSLS, Progress Petugas/Pengawas)' }, { status: 400 })
    }

    const result = await ingestFasih(pool, payload, { source: 'excel', token_id: null })
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Import gagal' }, { status: 500 })
  }
}

/** "progres_subsls_20260617_0500.xlsx" → "20260617_0500" */
function extractTs(filename: string): string | null {
  const m = filename.match(/(\d{8}_\d{4})/)
  return m ? m[1] : null
}
