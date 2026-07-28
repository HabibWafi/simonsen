/**
 * Cache in-memory dengan TTL untuk endpoint read yang di-poll berkali-kali.
 *
 * Hostinger menjalankan proses Node persisten (bukan serverless), jadi Map
 * module-level ini bertahan antar-request. Efeknya: berapa pun banyaknya user
 * yang polling, DB hanya di-hit MAKS 1× per TTL per key. Plus dedup "thundering
 * herd": banyak request bersamaan saat cache kedaluwarsa hanya memicu 1 query.
 *
 * Data progress berasal dari bot (update ~tiap 2 menit), jadi basi ≤ TTL (mis.
 * 30 dtk) tidak masalah untuk tampilan "realtime ~1 menit".
 */
type Entry = { at: number; data: any }

const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<any>>()

export async function cachedJson<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T

  const flying = inflight.get(key)
  if (flying) return flying as Promise<T>

  const p = (async () => {
    try {
      const data = await fn()
      store.set(key, { at: Date.now(), data })
      return data
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

/** Header cache-control seragam untuk endpoint publik (browser + CDN Hostinger). */
export const cacheHeaders = (ttlSec = 30) => ({
  'Cache-Control': `public, max-age=${Math.min(ttlSec, 15)}, s-maxage=${ttlSec}, stale-while-revalidate=${ttlSec}`,
})
