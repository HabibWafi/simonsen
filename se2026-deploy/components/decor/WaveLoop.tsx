import { CSSProperties } from 'react'
import { withBase } from '@/lib/basePath'

type Pos = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

interface Props {
  position?: Pos
  size?: number
  opacity?: number
  variant?: 'loop' | 'ribbon'
  style?: CSSProperties
}

const POSITION_STYLE: Record<Pos, CSSProperties> = {
  'top-right':    { top: -40,    right: -40 },
  'top-left':     { top: -40,    left: -40,  transform: 'scaleX(-1)' },
  'bottom-right': { bottom: -40, right: -40, transform: 'scaleY(-1)' },
  'bottom-left':  { bottom: -40, left: -40,  transform: 'scale(-1,-1)' },
}

export default function WaveLoop({ position = 'top-right', size = 400, opacity = 0.18, variant = 'loop', style }: Props) {
  const src = variant === 'loop' ? '/images/decor/wave-loop.png' : '/images/decor/wave-ribbon.png'
  return (
    <img
      src={withBase(src)}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: size,
        height: 'auto',
        opacity,
        pointerEvents: 'none',
        zIndex: 0,
        ...POSITION_STYLE[position],
        ...style,
      }}
    />
  )
}
