import { CSSProperties } from 'react'
import { withBase } from '@/lib/basePath'

interface Props {
  direction?: 'right' | 'down' | 'left' | 'up'
  size?: number
  opacity?: number
  style?: CSSProperties
  inline?: boolean
}

const ROTATION: Record<string, string> = {
  right: '0deg',
  down: '90deg',
  left: '180deg',
  up: '270deg',
}

export default function ChevronAccent({ direction = 'right', size = 32, opacity = 1, inline = false, style }: Props) {
  return (
    <img
      src={withBase('/images/decor/chevron.png')}
      alt=""
      aria-hidden="true"
      style={{
        display: inline ? 'inline-block' : 'block',
        width: size,
        height: size,
        objectFit: 'contain',
        opacity,
        transform: `rotate(${ROTATION[direction]})`,
        pointerEvents: 'none',
        verticalAlign: inline ? 'middle' : undefined,
        ...style,
      }}
    />
  )
}
