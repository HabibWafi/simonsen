'use client'

import { useEffect, useState } from 'react'
import type { PesResponse } from '@/lib/pes/domain'

export function usePes(query: string) {
  const [result, setResult] = useState<{ key: string; data: PesResponse } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    let running = false
    const refresh = async () => {
      if (running) return
      running = true
      try {
        const response = await fetch(`/api/se/2026/public/pes?${query}`, { cache: 'no-store', signal: controller.signal })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Data PES belum dapat dimuat')
        if (!controller.signal.aborted) { setResult({ key: query, data: body }); setFailure(null) }
      } catch (error) {
        if (!controller.signal.aborted) setFailure({ key: query, message: error instanceof Error ? error.message : 'Koneksi terputus; coba kembali nanti' })
      } finally { running = false }
    }
    void refresh()
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, 60_000)
    const onVisible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [query])
  const data = result?.key === query ? result.data : null
  const error = failure?.key === query ? failure.message : null
  return { data, error, loading: !data && !error }
}
