/**
 * KecamatanTooltip — render tooltip aggregate kecamatan/desa.
 * Saat filter = '' (Semua) → tampilkan total + breakdown 3 skala.
 * Saat filter = 'UMK'/'UM'/'UB' → tampilkan hanya skala terpilih + note.
 *
 * Dipakai sebagai HTML string di Leaflet tooltip + sebagai React component di MiniMap.
 */
import type { ProgressBreakdown, SkalaUsaha } from '@/types'

export interface FasihInfo {
  open: number; draft: number; submitted: number
  approved: number; rejected: number; revoked?: number
  selesai_cacah: number; pct_cacah: number
  selesai_approve: number; pct_approve: number
}

interface Props {
  nama: string
  target: number
  realisasi: number
  persentase: number
  breakdown?: ProgressBreakdown
  fasih?: FasihInfo | null     // data scraper Fasih (prioritas di atas breakdown skala)
  skalaFilter?: SkalaUsaha | ''  // '' = semua
  compact?: boolean
}

const SKALA_LABEL: Record<SkalaUsaha, string> = {
  UMK: 'UMK (Mikro & Kecil)',
  UM:  'UM  (Menengah)',
  UB:  'UB  (Besar)',
}

export function buildKecamatanTooltipHtml({
  nama, target, realisasi, persentase, breakdown, fasih, skalaFilter = '',
}: Omit<Props, 'compact'>): string {
  const skalaLabel = skalaFilter ? ` <span style="font-weight:500;opacity:.7;font-size:10px">[${skalaFilter}]</span>` : ''
  let body = `<div style="font-size:12px;line-height:1.55">
    Target: <b>${target.toLocaleString('id-ID')}</b> assignment${skalaLabel}<br>
    Selesai cacah: <b>${realisasi.toLocaleString('id-ID')}</b> (${persentase.toFixed(1)}%)
  </div>`

  if (fasih) {
    body += `<div style="border-top:1px solid rgba(0,0,0,.08);margin-top:8px;padding-top:8px;font-size:11px;line-height:1.7">
      <div style="display:flex;justify-content:space-between;gap:12px"><span style="opacity:.7">✓ Approved</span><span><b>${fasih.selesai_approve.toLocaleString('id-ID')}</b> <span style="opacity:.7">(${fasih.pct_approve.toFixed(1)}%)</span></span></div>
      <div style="display:flex;justify-content:space-between;gap:12px"><span style="opacity:.7">Open / Draft</span><span>${fasih.open.toLocaleString('id-ID')} / ${fasih.draft.toLocaleString('id-ID')}</span></div>
      <div style="display:flex;justify-content:space-between;gap:12px"><span style="opacity:.7">Submitted</span><span>${fasih.submitted.toLocaleString('id-ID')}</span></div>
      ${fasih.rejected ? `<div style="display:flex;justify-content:space-between;gap:12px"><span style="opacity:.7;color:#E8192C">Rejected</span><span style="color:#E8192C">${fasih.rejected.toLocaleString('id-ID')}</span></div>` : ''}
      ${fasih.revoked ? `<div style="display:flex;justify-content:space-between;gap:12px"><span style="opacity:.7;color:#9333EA">Revoked</span><span style="color:#9333EA">${fasih.revoked.toLocaleString('id-ID')}</span></div>` : ''}
    </div>`
    return `<div><div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#1A1A1A">${nama}</div>${body}</div>`
  }

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
  const { nama, target, realisasi, persentase, breakdown, fasih, skalaFilter = '', compact } = p
  return (
    <div style={{ fontSize: compact ? 11 : 12, lineHeight: 1.55, minWidth: 200 }}>
      <div style={{ fontWeight: 700, fontSize: compact ? 12 : 13, marginBottom: 4, color: '#1A1A1A' }}>{nama}</div>
      <div>
        Target: <b>{target.toLocaleString('id-ID')}</b> assignment{skalaFilter && <span style={{ opacity: .7, fontSize: 10 }}> [{skalaFilter}]</span>}<br />
        Selesai cacah: <b>{realisasi.toLocaleString('id-ID')}</b> ({persentase.toFixed(1)}%)
      </div>
      {fasih ? (
        <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', marginTop: 8, paddingTop: 8, fontSize: 11, lineHeight: 1.7 }}>
          <Row label="✓ Approved" value={`${fasih.selesai_approve.toLocaleString('id-ID')} (${fasih.pct_approve.toFixed(1)}%)`} />
          <Row label="Open / Draft" value={`${fasih.open.toLocaleString('id-ID')} / ${fasih.draft.toLocaleString('id-ID')}`} />
          <Row label="Submitted" value={fasih.submitted.toLocaleString('id-ID')} />
          {fasih.rejected > 0 && <Row label="Rejected" value={fasih.rejected.toLocaleString('id-ID')} danger />}
          {(fasih.revoked ?? 0) > 0 && <Row label="Revoked" value={(fasih.revoked ?? 0).toLocaleString('id-ID')} purple />}
        </div>
      ) : !skalaFilter && breakdown && (
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
      {!fasih && skalaFilter && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', marginTop: 8, paddingTop: 6, fontSize: 10, opacity: .65, fontStyle: 'italic' }}>
          Hanya menampilkan skala {skalaFilter}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, danger, purple }: { label: string; value: string; danger?: boolean; purple?: boolean }) {
  const c = danger ? '#E8192C' : purple ? '#9333EA' : undefined
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ opacity: .7, color: c }}>{label}</span>
      <span style={{ color: c }}><b>{value}</b></span>
    </div>
  )
}
