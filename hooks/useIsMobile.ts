'use client'

import { useEffect, useState } from 'react'

/**
 * SSR-safe hook subscribe `matchMedia(max-width: 768px)`.
 * Initial render: false (desktop) untuk hindari hydration mismatch.
 * Setelah mount, baca matchMedia + listen change.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}
