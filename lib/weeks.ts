// Bucket minggu SE2026: Senin–Minggu, mulai 15 Jun 2026, ditutup tiap Minggu,
// s/d 31 Agu 2026. Dipakai untuk progress mingguan & peringkat mingguan petugas.

export const WEEK_START = '2026-06-15'   // Senin
export const WEEK_END_CAP = '2026-08-31'
const ID_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const fmtShort = (iso: string) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${ID_MONTH[Number(m) - 1]}` }
export const addDays = (iso: string, n: number) =>
  new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
export const todayWib = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export type WeekBucket = { n: number; start: string; end: string; label: string }

/** Daftar minggu yang sudah dimulai (start <= hari ini WIB). */
export function weekBuckets(): WeekBucket[] {
  const out: WeekBucket[] = []
  const today = todayWib()
  let start = WEEK_START, n = 1
  while (start <= WEEK_END_CAP) {
    const end = addDays(start, 6)
    if (start <= today) out.push({ n, start, end, label: `M${n} (${fmtShort(start)}–${fmtShort(end)})` })
    start = addDays(start, 7); n++
  }
  return out
}

/** Akhir minggu sebelum bucket pada index `idx` (untuk baseline delta cumulative). */
export function prevEndOf(weeks: WeekBucket[], idx: number): string {
  return idx <= 0 ? addDays(weeks[0].start, -1) : weeks[idx - 1].end
}
