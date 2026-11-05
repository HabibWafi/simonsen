import { z } from 'zod'
import { addDays, dateWib } from './dates'
export { addDays, dateWib } from './dates'

export const statusFields = ['open', 'draft', 'submitted_pencacah', 'submitted_responden', 'approved', 'rejected', 'revoked', 'completed_admin', 'edited_admin', 'edited_pengawas'] as const
export const countFields = ['total', ...statusFields, 'selesai_cacah', 'selesai_approve'] as const
export type PesCounts = Record<typeof countFields[number], number>
export interface PesPetugas extends PesCounts {
  id: string
  nama_ppl: string
  nama_pml: string
  observed_at: string
  pct_cacah: number
  pct_approve: number
}
export interface PesHistoryRow {
  petugas_id: string
  tanggal: string
  total: number
  selesai_cacah: number
  selesai_approve: number
}
export interface PesHistoryPoint {
  tanggal: string
  total: number | null
  selesai_cacah: number | null
  selesai_approve: number | null
  delta_cacah: number | null
  delta_approve: number | null
  updated_count: number
  baseline_count: number
  spans_gap: boolean
}
export interface PesSummary {
  petugas: number
  total: number
  selesai_cacah: number
  selesai_approve: number
  sisa: number
  pct_cacah: number
  pct_approve: number
}
export interface PesResponse {
  petugas: PesPetugas[]
  options: { id: string; nama_ppl: string; nama_pml: string }[]
  summary: PesSummary
  history: PesHistoryPoint[]
  range: { from: string; to: string }
  latest_source_at: string | null
}

const count = z.number().int().min(0).max(2_147_483_647)
const name = z.string().trim().min(1).max(150).refine(v => !v.includes('@'), 'Gunakan nama, bukan email')
const statuses = Object.fromEntries(statusFields.map(field => [field, count.default(0)])) as Record<typeof statusFields[number], z.ZodDefault<typeof count>>
const petugasSchema = z.object({
  pencacah: z.string().trim().min(1).max(150),
  nama_ppl: name,
  nama_pml: name.or(z.literal('')).default(''),
  total: count,
  ...statuses,
  selesai_cacah: count,
  selesai_approve: count,
}).strict().superRefine((row, ctx) => {
  for (const field of countFields) {
    if (row[field] > row.total) ctx.addIssue({ code: 'custom', path: [field], message: 'Jumlah melebihi total assignment' })
  }
  if (row.selesai_approve > row.selesai_cacah) ctx.addIssue({ code: 'custom', path: ['selesai_approve'], message: 'Selesai pemeriksaan melebihi selesai pendataan' })
})

export const pesPayloadSchema = z.object({
  snapshot_ts: z.iso.datetime({ offset: true }).transform(v => new Date(v).toISOString()),
  petugas: z.array(petugasSchema).min(1).max(6000),
}).strict().superRefine((body, ctx) => {
  const keys = new Set<string>()
  body.petugas.forEach((row, i) => {
    if (keys.has(row.pencacah)) ctx.addIssue({ code: 'custom', path: ['petugas', i, 'pencacah'], message: 'Identitas petugas duplikat' })
    keys.add(row.pencacah)
  })
})
export type PesPayload = z.infer<typeof pesPayloadSchema>

export const percent = (done: number, target: number) => target > 0 ? Math.round(done / target * 1000) / 10 : 0

export function pesRange(params: URLSearchParams, today = dateWib()) {
  const to = params.get('to') || today
  const from = params.get('from') || addDays(to, -13)
  if (!z.iso.date().safeParse(from).success || !z.iso.date().safeParse(to).success) throw new Error('Tanggal tidak valid')
  if (from > to || to > today || Date.parse(to) - Date.parse(from) > 89 * 86400000) throw new Error('Pilih rentang 1–90 hari, maksimal hari ini (WIB)')
  return { from, to }
}

export function summarizePes(rows: PesPetugas[]): PesSummary {
  const total = rows.reduce((n, row) => n + row.total, 0)
  const selesai_cacah = rows.reduce((n, row) => n + row.selesai_cacah, 0)
  const selesai_approve = rows.reduce((n, row) => n + row.selesai_approve, 0)
  return { petugas: rows.length, total, selesai_cacah, selesai_approve, sisa: total - selesai_cacah, pct_cacah: percent(selesai_cacah, total), pct_approve: percent(selesai_approve, total) }
}

/** Carry known cumulative totals forward, but never invent a daily increment. */
export function buildPesHistory(rows: PesHistoryRow[], from: string, to: string): PesHistoryPoint[] {
  const last = new Map<string, PesHistoryRow>()
  const byDay = new Map<string, PesHistoryRow[]>()
  for (const row of [...rows].sort((a, b) => a.tanggal.localeCompare(b.tanggal))) {
    if (row.tanggal < from) last.set(row.petugas_id, row)
    else {
      if (!byDay.has(row.tanggal)) byDay.set(row.tanggal, [])
      byDay.get(row.tanggal)!.push(row)
    }
  }
  const points: PesHistoryPoint[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const updates = byDay.get(day) || []
    let deltaC = 0, deltaA = 0, baseline = 0, gap = false
    for (const row of updates) {
      const prev = last.get(row.petugas_id)
      if (prev) {
        deltaC += row.selesai_cacah - prev.selesai_cacah
        deltaA += row.selesai_approve - prev.selesai_approve
        if (addDays(prev.tanggal, 1) < day) gap = true
      } else baseline++
      last.set(row.petugas_id, row)
    }
    const known = [...last.values()]
    const sum = (field: 'total' | 'selesai_cacah' | 'selesai_approve') => known.length ? known.reduce((n, r) => n + r[field], 0) : null
    points.push({ tanggal: day, total: sum('total'), selesai_cacah: sum('selesai_cacah'), selesai_approve: sum('selesai_approve'), delta_cacah: updates.length && !baseline ? deltaC : null, delta_approve: updates.length && !baseline ? deltaA : null, updated_count: updates.length, baseline_count: baseline, spans_gap: gap })
  }
  return points
}
