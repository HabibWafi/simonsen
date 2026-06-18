import { CSSProperties } from 'react'
import { withBase } from '@/lib/basePath'

type Pos = 'center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'left' | 'right'

interface Props {
  position?: Pos
  size?: number
  opacity?: number
  style?: CSSProperties
}

const POSITION_STYLE: Record<Pos, CSSProperties> = {
  'center':       { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
  'top-right':    { top: -20, right: -20 },
  'top-left':     { top: -20, left: -20 },
  'bottom-right': { bottom: -20, right: -20 },
  'bottom-left':  { bottom: -20, left: -20 },
  'left':         { top: '50%', left: -40, transform: 'translateY(-50%)' },
  'right':        { top: '50%', right: -40, transform: 'translateY(-50%)' },
}

export default function DotsPattern({ position = 'center', size = 300, opacity = 0.12, style }: Props) {
  return (
    <img
      src={withBase('/images/decor/dots.png')}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        objectFit: 'contain',
        opacity,
        pointerEvents: 'none',
        zIndex: 0,
        ...POSITION_STYLE[position],
        ...style,
      }}
    />
  )
}
