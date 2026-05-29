/**
 * Parser Excel master usaha.
 * Kolom wajib (case-insensitive):
 *   IDSBR, NAMA, ALAMAT, KDKEC, KDDESA, NMKEC, NMDESA, SKALA USAHA
 * Kolom opsional:
 *   KD, KDKA, KDSLS, NMPROV, NMKAB, NMSLS
 */
import * as XLSX from 'xlsx'
import type { SkalaUsaha } from '@/types'

export interface ParsedUsahaRow {
  rowIndex: number
  idsbr: string
  nama: string
  alamat: string | null
  kdprov: string | null
  kdkab: string | null
  kdkec: string
  kddesa: string
  kdsls: string | null
  nmprov: string | null
  nmkab: string | null
  nmkec: string
  nmdesa: string
  nmsls: string | null
  skala_usaha: SkalaUsaha
}

export interface ParseUsahaError {
  rowIndex: number
  idsbr?: string
  message: string
}

export interface ParseUsahaResult {
  rows: ParsedUsahaRow[]
  errors: ParseUsahaError[]
  missingColumns: string[]
}

const REQUIRED = ['IDSBR', 'NAMA', 'KDKEC', 'KDDESA', 'NMKEC', 'NMDESA', 'SKALA USAHA']

function normKey(k: string): string {
  return String(k).trim().toUpperCase().replace(/\s+/g, ' ')
}

function pick(obj: any, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k] ?? obj[k.toUpperCase()] ?? obj[k.toLowerCase()]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

function normSkala(v: string | null): SkalaUsaha | null {
  if (!v) return null
  const x = v.toUpperCase().replace(/[^A-Z]/g, '')
  if (x === 'UMK' || x === 'UM' || x === 'UB') return x as SkalaUsaha
  return null
}

export function parseUsahaBuffer(buf: Buffer): ParseUsahaResult {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: '', raw: false })

  // normalize header keys per row
  const rows: any[] = raw.map(r => {
    const out: any = {}
    for (const k of Object.keys(r)) out[normKey(k)] = r[k]
    return out
  })

  // detect missing columns
  const headers = new Set<string>()
  if (rows.length) for (const k of Object.keys(rows[0])) headers.add(k)
  const missing = REQUIRED.filter(c => !headers.has(c))
  if (missing.length) {
    return { rows: [], errors: [], missingColumns: missing }
  }

  const parsed: ParsedUsahaRow[] = []
  const errors: ParseUsahaError[] = []

  rows.forEach((r, i) => {
    const rowIndex = i + 2 // Excel row (1-based + header)
    const idsbr = pick(r, 'IDSBR')
    if (!idsbr) {
      errors.push({ rowIndex, message: 'IDSBR kosong' }); return
    }
    const skala = normSkala(pick(r, 'SKALA USAHA', 'SKALAUSAHA', 'SKALA'))
    if (!skala) {
      errors.push({ rowIndex, idsbr, message: `SKALA USAHA tidak valid (harus UMK/UM/UB)` }); return
    }
    const kdkec = pick(r, 'KDKEC')
    const kddesa = pick(r, 'KDDESA')
    const nmkec = pick(r, 'NMKEC')
    const nmdesa = pick(r, 'NMDESA')
    const nama = pick(r, 'NAMA')
    if (!kdkec || !kddesa || !nmkec || !nmdesa || !nama) {
      errors.push({ rowIndex, idsbr, message: 'Field wajib (NAMA/KDKEC/KDDESA/NMKEC/NMDESA) kosong' }); return
    }
    parsed.push({
      rowIndex,
      idsbr,
      nama,
      alamat: pick(r, 'ALAMAT'),
      kdprov: pick(r, 'KD', 'KDPROV'),
      kdkab:  pick(r, 'KDKA', 'KDKAB'),
      kdkec,
      kddesa,
      kdsls:  pick(r, 'KDSLS'),
      nmprov: pick(r, 'NMPROV'),
      nmkab:  pick(r, 'NMKAB'),
      nmkec,
      nmdesa,
      nmsls:  pick(r, 'NMSLS'),
      skala_usaha: skala,
    })
  })

  return { rows: parsed, errors, missingColumns: [] }
}
