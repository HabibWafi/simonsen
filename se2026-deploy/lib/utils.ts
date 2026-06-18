export function formatNumber(n: number, locale = 'id-ID') {
  return n.toLocaleString(locale)
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString('id-ID', opts ?? { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Days remaining until 31 August 2026 23:59:59 WIB */
export function hitungHariTersisa(): number {
  const deadline = new Date('2026-08-31T23:59:59+07:00').getTime()
  const diff = deadline - Date.now()
  return diff > 0 ? Math.ceil(diff / 86400000) : 0
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
