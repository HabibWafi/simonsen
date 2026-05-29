'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import KecamatanTooltip from './KecamatanTooltip'
import type { ProgressBreakdown, SkalaUsaha } from '@/types'

type Kec = {
  id: number
  kdkec?: string
  kecamatan: string
  nmkec?: string
  target_usaha: number
  realisasi: number
  persentase: number
  petugas_count: number
  status: string
  breakdown?: ProgressBreakdown | null
}

interface Props {
  progress: Kec[]
  skalaFilter?: SkalaUsaha | ''
}

/**
 * Koordinat approximate kecamatan Musi Rawas di viewBox 600x400.
 * Primary key: kdkec (kode BPS). Fallback: nama uppercase.
 * Musi Rawas memanjang barat-timur, ibu kota (Muara Beliti) di tengah-selatan.
 */
const COORDS: Record<string, { x: number; y: number }> = {
  // ── Lookup by kdkec (stable, tidak terpengaruh ejaan) ──────────────────
  '1605010': { x: 195, y: 215 },  // BTS ULU
  '1605020': { x: 80,  y: 195 },  // RAWAS ILIR
  '1605030': { x: 405, y: 215 },  // SUKU TENGAH LAKITAN ULU
  '1605031': { x: 280, y: 105 },  // SELANGIT (kode lama)
  '1605032': { x: 335, y: 130 },  // SUMBER HARTA (kode lama)
  '1605040': { x: 360, y: 270 },  // TUGUMULYO
  '1605041': { x: 395, y: 285 },  // PURWODADI
  '1605050': { x: 295, y: 245 },  // MUARA BELITI
  '1605051': { x: 165, y: 285 },  // TIANG PUMPUNG KEPUNGUT
  '1605060': { x: 470, y: 175 },  // JAYALOKA
  '1605061': { x: 415, y: 295 },  // SUKA KARYA
  '1605070': { x: 245, y: 235 },  // MUARA KELINGI
  '1605071': { x: 320, y: 195 },  // BULANG TENGAH SUKU ULU
  '1605072': { x: 180, y: 165 },  // TUAH NEGERI
  '1605080': { x: 430, y: 220 },  // MUARA LAKITAN
  '1605090': { x: 250, y: 195 },  // MEGANG SAKTI
  '1605100': { x: 240, y: 145 },  // STL ULU TERAWAS
  '1605110': { x: 340, y: 140 },  // SUMBER HARTA (kode baru)
  '1605120': { x: 200, y: 175 },  // TUAH NEGERI (kode baru)
  '1605130': { x: 310, y: 255 },  // MUARA BELITI (kode baru)
  '1605140': { x: 295, y: 95 },   // SELANGIT (kode baru)
  // ── Fallback by nama ALL CAPS (dari DB) ────────────────────────────────
  'MUARA BELITI':           { x: 295, y: 245 },
  'TUGUMULYO':              { x: 360, y: 270 },
  'BTS ULU':                { x: 195, y: 215 },
  'MUARA LAKITAN':          { x: 430, y: 220 },
  'MEGANG SAKTI':           { x: 250, y: 195 },
  'RAWAS ILIR':             { x: 80,  y: 195 },
  'JAYALOKA':               { x: 470, y: 175 },
  'SUKA KARYA':             { x: 415, y: 295 },
  'SUKAKARYA':              { x: 415, y: 295 },
  'BULANG TENGAH SUKU ULU': { x: 320, y: 195 },
  'STL ULU TERAWAS':        { x: 240, y: 145 },
  'SELANGIT':               { x: 280, y: 105 },
  'TIANG PUMPUNG KEPUNGUT': { x: 165, y: 285 },
  'SUKU TENGAH LAKITAN ULU':{ x: 405, y: 215 },
  'SUMBER HARTA':           { x: 335, y: 130 },
  'PURWODADI':              { x: 395, y: 285 },
  'MUARA KELINGI':          { x: 245, y: 235 },
  'TUAH NEGERI':            { x: 180, y: 165 },
  // Fallback Title Case (lama)
  'Muara Beliti':           { x: 295, y: 245 },
  'Tugumulyo':              { x: 360, y: 270 },
  'BTS Ulu':                { x: 195, y: 215 },
  'Muara Lakitan':          { x: 430, y: 220 },
  'Megang Sakti':           { x: 250, y: 195 },
  'Rawas Ilir':             { x: 80,  y: 195 },
  'Jayaloka':               { x: 470, y: 175 },
  'Sukakarya':              { x: 415, y: 295 },
  'Bulang Tengah Suku Ulu': { x: 320, y: 195 },
  'STL Ulu Terawas':        { x: 240, y: 145 },
  'Selangit':               { x: 280, y: 105 },
  'Tiang Pumpung Kepungut': { x: 165, y: 285 },
}

function heatColor(pct: number): string {
  if (pct >= 75) return '#00A651'
  if (pct >= 50) return '#E8751A'
  if (pct >= 25) return '#F5A623'
  if (pct > 0)   return '#FFD9B8'
  return '#EDE3D8'
}

function dotRadius(target: number): number {
  // 340..1240 → 7..14
  const min = 340, max = 1240, rMin = 7, rMax = 14
  const t = Math.max(0, Math.min(1, (target - min) / (max - min)))
  return rMin + t * (rMax - rMin)
}

const LEGEND = [
  { label: '0–25%',   color: '#FFD9B8' },
  { label: '25–50%',  color: '#F5A623' },
  { label: '50–75%',  color: '#E8751A' },
  { label: '> 75%',   color: '#00A651' },
]

export default function MiniMapMusiRawas({ progress, skalaFilter = '' }: Props) {
  const [hover, setHover] = useState<{ kec: Kec; x: number; y: number } | null>(null)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{
        background: 'rgba(255,255,255,.72)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid rgba(255,255,255,.7)',
        borderRadius: 22,
        padding: 24,
        boxShadow: '0 12px 40px rgba(232,117,26,.14), 0 2px 8px rgba(0,0,0,.04)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E8751A', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>Peta Sebaran</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', letterSpacing: -.2 }}>14 Kecamatan Musi Rawas</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LEGEND.map(l => (
              <div key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: '#6B6B6B' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block', boxShadow: `0 0 0 2px white` }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* SVG map */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '600 / 400', borderRadius: 14, background: 'linear-gradient(135deg, #FAF8F5 0%, #F5EDE0 100%)', border: '1px solid #EDE3D8', overflow: 'hidden' }}
             onMouseLeave={() => setHover(null)}>
          <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
            {/* Approximate outline boundary Musi Rawas — bentuk kasar memanjang */}
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              d="M 50,180 Q 70,110 130,75 Q 200,55 280,75 Q 360,85 440,110 Q 510,140 540,200 Q 530,280 480,320 Q 400,355 320,340 Q 240,335 170,320 Q 100,300 60,260 Q 40,220 50,180 Z"
              fill="rgba(232,117,26,.06)"
              stroke="rgba(232,117,26,.35)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {/* Garis sungai dummy (Sungai Musi melintang) */}
            <motion.path
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, delay: 0.4, ease: 'easeOut' }}
              d="M 80,260 Q 180,235 290,255 Q 400,275 520,250"
              fill="none"
              stroke="rgba(24,119,242,.25)"
              strokeWidth={3}
              strokeLinecap="round"
            />

            {/* Dots per kecamatan */}
            {progress.map((k, i) => {
              // Prioritas lookup: kdkec → nmkec (ALL CAPS) → kecamatan (Title Case)
              const c = COORDS[k.kdkec ?? ''] ?? COORDS[k.nmkec ?? ''] ?? COORDS[k.kecamatan]
              if (!c) return null
              const color = heatColor(k.persentase)
              const r = dotRadius(k.target_usaha)
              return (
                <g key={k.id}>
                  {/* Pulse ring kalau aktif (>0%) */}
                  {k.persentase > 0 && (
                    <motion.circle
                      cx={c.x} cy={c.y} r={r}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 2.4 }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15, ease: 'easeOut' }}
                      style={{ transformOrigin: `${c.x}px ${c.y}px` }}
                    />
                  )}
                  {/* Dot */}
                  <motion.circle
                    cx={c.x} cy={c.y} r={r}
                    fill={color}
                    stroke="white"
                    strokeWidth={2}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    style={{ cursor: 'pointer', transformOrigin: `${c.x}px ${c.y}px`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.18))' }}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect()
                      if (!rect) return
                      setHover({ kec: k, x: e.clientX - rect.left, y: e.clientY - rect.top })
                    }}
                    onMouseMove={(e) => {
                      const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect()
                      if (!rect) return
                      setHover({ kec: k, x: e.clientX - rect.left, y: e.clientY - rect.top })
                    }}
                  />
                  {/* Label kecil di atas dot untuk kecamatan dengan progress >0 */}
                  {k.persentase > 0 && r >= 10 && (
                    <motion.text
                      x={c.x} y={c.y - r - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#3D3D3D"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1 + i * 0.05 }}
                    >
                      {k.persentase}%
                    </motion.text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Tooltip */}
          <AnimatePresence>
            {hover && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  left: Math.min(hover.x + 12, 380),
                  top: Math.max(hover.y - 80, 8),
                  background: 'white',
                  padding: '10px 14px',
                  borderRadius: 10,
                  pointerEvents: 'none',
                  zIndex: 5,
                  boxShadow: '0 8px 24px rgba(0,0,0,.16), 0 2px 6px rgba(0,0,0,.06)',
                  border: '1px solid #EDE3D8',
                  minWidth: 220,
                }}
              >
                <KecamatanTooltip
                  nama={hover.kec.kecamatan}
                  target={hover.kec.target_usaha}
                  realisasi={hover.kec.realisasi}
                  persentase={hover.kec.persentase}
                  breakdown={hover.kec.breakdown ?? undefined}
                  skalaFilter={skalaFilter}
                  compact
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer note */}
        <p style={{ fontSize: 11, color: '#8C7B6B', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
          Ukuran titik proporsional dengan target usaha · Warna sesuai persentase realisasi
        </p>
      </div>
    </div>
  )
}
