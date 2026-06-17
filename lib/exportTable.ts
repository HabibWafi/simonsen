'use client'

/**
 * Util export client-side TANPA dependency eksternal.
 * - exportCsv: unduh CSV dari data array.
 * - exportTablePng: render tabel jadi SVG (tinggi penuh, tidak terpotong) → PNG/JPEG.
 * - exportSvgNodePng: serialisasi <svg> (mis. chart recharts) → PNG/JPEG.
 */

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const csvEscape = (v: any) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(csvEscape).join(','), ...rows.map(r => r.map(csvEscape).join(','))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }) // BOM untuk Excel
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const xmlEsc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface TableCol { label: string; width: number; align?: 'left' | 'right' | 'center'; color?: (row: any) => string }

/**
 * Bangun SVG tabel berukuran pas semua baris (tidak terpotong), lalu unduh PNG/JPEG.
 */
export async function exportTablePng(opts: {
  filename: string
  title: string
  subtitle?: string
  columns: TableCol[]
  rows: any[]                       // tiap row: object
  cell: (row: any, colIndex: number) => string  // teks per sel
  format?: 'png' | 'jpeg'
  scale?: number
}) {
  const { filename, title, subtitle, columns, rows, cell } = opts
  const format = opts.format ?? 'png'
  const scale = opts.scale ?? 2
  const padX = 24, headerH = 64, rowH = 34, colGap = 16
  const totalW = columns.reduce((a, c) => a + c.width, 0) + padX * 2 + colGap * (columns.length - 1)
  const tableTop = headerH + 34
  const totalH = tableTop + (rows.length + 1) * rowH + 28

  // x offset tiap kolom
  const xs: number[] = []
  let acc = padX
  for (const c of columns) { xs.push(acc); acc += c.width + colGap }

  const cellX = (i: number, align: string | undefined) =>
    align === 'right' ? xs[i] + columns[i].width
    : align === 'center' ? xs[i] + columns[i].width / 2
    : xs[i]
  const anchor = (align: string | undefined) => align === 'right' ? 'end' : align === 'center' ? 'middle' : 'start'

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" font-family="Inter, Arial, sans-serif">`
  svg += `<rect width="${totalW}" height="${totalH}" fill="#ffffff"/>`
  // header brand
  svg += `<rect width="${totalW}" height="6" fill="#E8751A"/>`
  svg += `<text x="${padX}" y="36" font-size="18" font-weight="800" fill="#1A1A1A">${xmlEsc(title)}</text>`
  if (subtitle) svg += `<text x="${padX}" y="56" font-size="12" fill="#8C7B6B">${xmlEsc(subtitle)}</text>`
  // header row
  const hy = tableTop
  svg += `<rect x="0" y="${hy}" width="${totalW}" height="${rowH}" fill="#FDF1E5"/>`
  columns.forEach((c, i) => {
    svg += `<text x="${cellX(i, c.align)}" y="${hy + rowH / 2 + 4}" font-size="12" font-weight="700" fill="#6B6B6B" text-anchor="${anchor(c.align)}">${xmlEsc(c.label)}</text>`
  })
  // body
  rows.forEach((row, ri) => {
    const y = hy + (ri + 1) * rowH
    if (ri % 2 === 1) svg += `<rect x="0" y="${y}" width="${totalW}" height="${rowH}" fill="#FAFAFA"/>`
    columns.forEach((c, ci) => {
      const color = c.color ? c.color(row) : '#1A1A1A'
      svg += `<text x="${cellX(ci, c.align)}" y="${y + rowH / 2 + 4}" font-size="12" fill="${color}" text-anchor="${anchor(c.align)}">${xmlEsc(cell(row, ci))}</text>`
    })
    svg += `<line x1="0" y1="${y + rowH}" x2="${totalW}" y2="${y + rowH}" stroke="#EFE7DD" stroke-width="1"/>`
  })
  svg += `<text x="${padX}" y="${totalH - 10}" font-size="10" fill="#B0A697">Portal Sensus BPS Kabupaten Musi Rawas · diekspor ${new Date().toLocaleString('id-ID')}</text>`
  svg += `</svg>`

  await rasterizeSvg(svg, totalW, totalH, scale, format, filename)
}

export async function exportSvgNodePng(svgEl: SVGSVGElement, filename: string, opts?: { format?: 'png' | 'jpeg'; scale?: number; bg?: string }) {
  const format = opts?.format ?? 'png'
  const scale = opts?.scale ?? 2
  const rect = svgEl.getBoundingClientRect()
  const w = Math.ceil(rect.width || Number(svgEl.getAttribute('width')) || 800)
  const h = Math.ceil(rect.height || Number(svgEl.getAttribute('height')) || 400)
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  // background putih
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bgRect.setAttribute('width', String(w)); bgRect.setAttribute('height', String(h)); bgRect.setAttribute('fill', opts?.bg ?? '#ffffff')
  clone.insertBefore(bgRect, clone.firstChild)
  const svgStr = new XMLSerializer().serializeToString(clone)
  await rasterizeSvg(svgStr, w, h, scale, format, filename)
}

async function rasterizeSvg(svgStr: string, w: number, h: number, scale: number, format: 'png' | 'jpeg', filename: string) {
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(w * scale)
    canvas.height = Math.ceil(h * scale)
    const ctx = canvas.getContext('2d')!
    if (format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height) }
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const dataUrl = canvas.toDataURL(mime, 0.95)
    triggerDownload(dataUrl, filename)
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
