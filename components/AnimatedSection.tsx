'use client'
import { CSSProperties, ReactNode, ElementType } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface Props {
  children: ReactNode
  direction?: 'up' | 'left' | 'right' | 'down' | 'scale'
  delay?: number          // milliseconds
  duration?: number       // milliseconds, default 600
  amount?: number         // viewport amount, default 0.15
  style?: CSSProperties
  className?: string
  as?: ElementType
  once?: boolean          // default true
}

const EASE = [0.22, 1, 0.36, 1] as const

const offsetMap: Record<NonNullable<Props['direction']>, { x?: number; y?: number; scale?: number }> = {
  up:    { y: 28 },
  down:  { y: -24 },
  left:  { x: -32 },
  right: { x: 32 },
  scale: { scale: 0.94 },
}

export default function AnimatedSection({
  children,
  direction = 'up',
  delay = 0,
  duration = 600,
  amount = 0.15,
  style,
  className,
  as,
  once = true,
}: Props) {
  const reduce = useReducedMotion()
  void as // keep prop for API compatibility — selalu render motion.div

  const off = offsetMap[direction]
  const initial = reduce
    ? { opacity: 0 }
    : { opacity: 0, x: off.x ?? 0, y: off.y ?? 0, scale: off.scale ?? 1 }

  const animate = { opacity: 1, x: 0, y: 0, scale: 1 }

  return (
    <motion.div
      className={className}
      style={style}
      initial={initial}
      whileInView={animate}
      viewport={{ once, amount }}
      transition={{ duration: duration / 1000, ease: EASE, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  )
}
