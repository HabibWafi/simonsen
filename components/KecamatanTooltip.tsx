/**
 * KecamatanTooltip — render tooltip aggregate kecamatan/desa.
 * Saat filter = '' (Semua) → tampilkan total + breakdown 3 skala.
 * Saat filter = 'UMK'/'UM'/'UB' → tampilkan hanya skala terpilih + note.
 *
 * Dipakai sebagai HTML string di Leaflet tooltip + sebagai React component di MiniMap.
 */
import type { ProgressBreakdown, SkalaUsaha } from '@/types'

interface Props {
  nama: string
  target: number
  realisasi: number
  persentase: number
  breakdown?: ProgressBreakdown
  skalaFilter?: SkalaUsaha | ''  // '' = semua
  compact?: boolean
}

const SKALA_LABEL: Record<SkalaUsaha, string> = {
  UMK: 'UMK (Mikro & Kecil)',
  UM:  'UM  (Menengah)',
  UB:  'UB  (Besar)',
}

export function buildKecamatanTooltipHtml({
  nama, target, realisasi, persentase, breakdown, skalaFilter = '',
}: Omit<Props, 'compact'>): string {
  const skalaLabel = skalaFilter ? ` <span style="font-weight:500;opacity:.7;font-size:10px">[${skalaFilter}]</span>` : ''
  let body = `<div style="font-size:12px;line-height:1.55">
    Target: <b>${target.toLocaleString('id-ID')}</b> usaha${skalaLabel}<br>
    Realisasi: <b>${realisasi.toLocaleString('id-ID')}</b> (${persentase.toFixed(1)}%)
  </div>`

  if (!skalaFilter && breakdown) {
    body += `<div style="border-top:1px solid rgba(0,0,0,.08);margin-top:8px;padding-top:8px;font-size:11px;line-height:1.7">`
    for (const k of ['UMK','UM','UB'] as SkalaUsaha[]) {
      const b = breakdown[k]
      body += `<div style="display:flex;justify-content:space-between;gap:12px">
        <span style="opacity:.7"><b>${k}</b></span>
        <span><b>${b.target.toLocaleString('id-ID')}</b> / ${b.realisasi.toLocaleString('id-ID')} <span style="opacity:.7">(${b.persentase.toFixed(0)}%)</span></span>
      </div>`
    }
    body += `</div>`
  } else if (skalaFilter) {
    body += `<div style="border-top:1px solid rgba(0,0,0,.08);margin-top:8px;padding-top:6px;font-size:10px;opacity:.65;font-style:italic">Hanya menampilkan skala ${skalaFilter}</div>`
  }

  return `<div><div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#1A1A1A">${nama}</div>${body}</div>`
}

export default function KecamatanTooltip(p: Props) {
  const { nama, target, realisasi, persentase, breakdown, skalaFilter = '', compact } = p
  return (
    <div style={{ fontSize: compact ? 11 : 12, lineHeight: 1.55, minWidth: 200 }}>
      <div style={{ fontWeight: 700, fontSize: compact ? 12 : 13, marginBottom: 4, color: '#1A1A1A' }}>{nama}</div>
      <div>
        Target: <b>{target.toLocaleString('id-ID')}</b> usaha{skalaFilter && <span style={{ opacity: .7, fontSize: 10 }}> [{skalaFilter}]</span>}<br />
        Realisasi: <b>{realisasi.toLocaleString('id-ID')}</b> ({persentase.toFixed(1)}%)
      </div>
      {!skalaFilter && breakdown && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', marginTop: 8, paddingTop: 8, fontSize: 11, lineHeight: 1.7 }}>
          {(['UMK','UM','UB'] as SkalaUsaha[]).map(k => {
            const b = breakdown[k]
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ opacity: .7 }}><b>{k}</b></span>
                <span><b>{b.target.toLocaleString('id-ID')}</b> / {b.realisasi.toLocaleString('id-ID')} <span style={{ opacity: .7 }}>({b.persentase.toFixed(0)}%)</span></span>
              </div>
            )
          })}
        </div>
      )}
      {skalaFilter && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', marginTop: 8, paddingTop: 6, fontSize: 10, opacity: .65, fontStyle: 'italic' }}>
          Hanya menampilkan skala {skalaFilter}
        </div>
      )}
    </div>
  )
}
