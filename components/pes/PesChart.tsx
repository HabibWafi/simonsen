'use client'

import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import type { PesHistoryPoint } from '@/lib/pes/domain'

export default function PesChart({ points, daily }: { points: PesHistoryPoint[]; daily: boolean }) {
  const shortDate = (value: string) => `${Number(value.slice(8, 10))}/${value.slice(5, 7)}`
  return <ResponsiveContainer width="100%" height={310}>
    <ComposedChart data={points} margin={{ top: 16, right: 22, left: 0, bottom: 12 }} accessibilityLayer>
      <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#ede3d8" />
      <XAxis dataKey="tanggal" tickFormatter={shortDate} tick={{ fontSize: 11 }} minTickGap={24} />
      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={52} />
      <Tooltip labelFormatter={value => String(value)} formatter={(value, name) => [value == null ? '—' : Number(value).toLocaleString('id-ID'), name]} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      {daily ? <>
        <ReferenceLine y={0} stroke="#8c7b6b" />
        <Bar dataKey="delta_cacah" name="Perubahan pendataan" fill="#e8751a" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="delta_approve" name="Perubahan pemeriksaan" fill="#00a651" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </> : <>
        <Line type="stepAfter" dataKey="total" name="Target assignment" stroke="#1877f2" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
        <Line type="stepAfter" dataKey="selesai_cacah" name="Selesai pendataan" stroke="#e8751a" dot={false} strokeWidth={3} isAnimationActive={false} />
        <Line type="stepAfter" dataKey="selesai_approve" name="Selesai pemeriksaan" stroke="#00a651" dot={false} strokeWidth={2} isAnimationActive={false} />
      </>}
    </ComposedChart>
  </ResponsiveContainer>
}
