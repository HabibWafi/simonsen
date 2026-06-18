'use client'
import { useEffect, useRef, useState } from 'react'

type Direction = 'up' | 'left' | 'right' | 'none'

interface Options {
  threshold?: number
  once?: boolean
  delay?: number
  direction?: Direction
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(opts: Options = {}) {
  const { threshold = 0.15, once = true, delay = 0, direction = 'up' } = opts
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) {
            setTimeout(() => setVisible(true), delay)
          } else {
            setVisible(true)
          }
          if (once) observer.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once, delay])

  const animName = direction === 'up' ? 'fadeUp' : direction === 'left' ? 'fadeLeft' : direction === 'right' ? 'fadeRight' : 'none'

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible
      ? 'none'
      : direction === 'up'
        ? 'translateY(22px)'
        : direction === 'left'
          ? 'translateX(-24px)'
          : direction === 'right'
            ? 'translateX(24px)'
            : 'none',
    transition: `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms`,
  }

  return { ref, visible, style, animName }
}
