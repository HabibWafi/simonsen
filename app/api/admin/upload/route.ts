import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { requireRole } from '@/lib/auth-guard'
import { readFormData, RequestBodyError } from '@/lib/request-body'

export const runtime = 'nodejs'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_BYTES = 8 * 1024 * 1024 // 8MB sebelum kompresi
const FOLDERS = ['posts', 'tim'] as const

/**
 * POST /api/admin/upload  (multipart: file, folder=posts|tim)
 * Kompres → WebP (resize maks 1600px, quality 80), simpan di public/uploads/<folder>.
 * Return { url }.
 */
export async function POST(req: NextRequest) {
  const guard = await requireRole(['admin', 'koordinator'], req)
  if (guard instanceof NextResponse) return guard

  try {
    const form = await readFormData(req, MAX_BYTES + 64 * 1024)
    const file = form.get('file')
    const folderRaw = String(form.get('folder') ?? 'posts')
    const folder = (FOLDERS as readonly string[]).includes(folderRaw) ? folderRaw : 'posts'

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }
    const blob = file as File
    if (!ALLOWED.includes(blob.type)) {
      return NextResponse.json({ error: `Tipe file tidak didukung: ${blob.type}. Gunakan JPG/PNG/WebP.` }, { status: 400 })
    }
    if (blob.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Ukuran file melebihi 8MB' }, { status: 400 })
    }

    const buf = Buffer.from(await blob.arrayBuffer())
    const jpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    const png = buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const webpSignature = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP'
    if (!jpeg && !png && !webpSignature) {
      return NextResponse.json({ error: 'Isi file harus berupa JPG/PNG/WebP' }, { status: 400 })
    }
    const image = sharp(buf, { limitInputPixels: 24_000_000, failOn: 'warning' })
    const metadata = await image.metadata()
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
      return NextResponse.json({ error: 'Isi file harus berupa JPG/PNG/WebP statis' }, { status: 400 })
    }
    const webp = await image
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()

    const dir = join(process.cwd(), 'public', 'uploads', folder)
    await mkdir(dir, { recursive: true })
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`
    await writeFile(join(dir, filename), webp)

    return NextResponse.json({ url: `/uploads/${folder}/${filename}`, size: webp.length })
  } catch (e: any) {
    if (e instanceof RequestBodyError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'Upload gagal; periksa format dan dimensi gambar' }, { status: 400 })
  }
}
