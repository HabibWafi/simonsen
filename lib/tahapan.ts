import { jadwalTimeline } from './mockData'
import type { Tahapan, TahapanStatus } from '@/types'

const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })

export const defaultTahapan: Tahapan[] = jadwalTimeline.map(item => ({ ...item, status: 'akan-datang', urutan: item.id }))

export function resolveTahapan(item: Tahapan, now = Date.now()): Tahapan {
  // Legacy seeds have no dates. Only reuse defaults when both title and period match.
  const fallback = defaultTahapan.find(t => t.judul === item.judul && t.periode === item.periode)
  const start_date = item.start_date?.slice(0, 10) || fallback?.start_date || null
  const end_date = item.end_date?.slice(0, 10) || fallback?.end_date || null
  const today = dateFormatter.format(new Date(now))
  let status: TahapanStatus = item.status
  if (end_date && today > end_date) status = 'selesai'
  else if (status !== 'selesai') {
    if (start_date && today < start_date) status = 'akan-datang'
    else if (start_date && today >= start_date) status = 'aktif'
  }
  return { ...item, start_date, end_date, status }
}

export function pendataanStage(items: Tahapan[]): Tahapan | undefined {
  return items.find(item => /door[\s-]*to[\s-]*door/i.test(item.judul))
}

export function pendataanDeadline(items: Tahapan[]): number {
  const end = pendataanStage(items)?.end_date ?? defaultTahapan[3].end_date
  return Date.parse(`${end}T23:59:59.999+07:00`)
}
