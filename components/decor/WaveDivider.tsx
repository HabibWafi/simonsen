import { CSSProperties } from 'react'
import { withBase } from '@/lib/basePath'

interface Props {
  position?: 'top' | 'bottom'
  size?: 'sm' | 'md' | 'lg'
  opacity?: number
  flip?: boolean
  style?: CSSProperties
}

const HEIGHT_MAP = { sm: 48, md: 80, lg: 120 }

export default function WaveDivider({ position = 'bottom', size = 'md', opacity = 0.35, flip = false, style }: Props) {
  const height = HEIGHT_MAP[size]
  return (
    <img
      src={withBase('/images/decor/wave.png')}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
        height,
        [position]: 0,
        objectFit: 'cover',
        objectPosition: 'center',
        opacity,
        pointerEvents: 'none',
        transform: flip ? 'scaleX(-1)' : undefined,
        zIndex: 0,
        ...style,
      }}
    />
  )
}
