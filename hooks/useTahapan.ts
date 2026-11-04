'use client'

import { useEffect, useState } from 'react'
import { defaultTahapan, resolveTahapan } from '@/lib/tahapan'
import type { Tahapan } from '@/types'

export function useTahapan() {
  const [items, setItems] = useState<Tahapan[]>(defaultTahapan)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const refresh = async () => {
      setNow(Date.now())
      try {
        const res = await fetch('/api/tahapan', { cache: 'no-store', signal: controller.signal })
        if (!res.ok) return
        const body = await res.json()
        if (!controller.signal.aborted && Array.isArray(body.data)) setItems(body.data)
      } catch { /* The dated fallback remains available when the API is unavailable. */ }
    }
    void refresh()
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, 60_000)
    const onVisible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  return { tahapan: now === null ? items : items.map(item => resolveTahapan(item, now)), now }
}
