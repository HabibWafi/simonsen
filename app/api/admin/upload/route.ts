import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { requireRole } from '@/lib/auth-guard'

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
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard

  try {
    const form = await req.formData()
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
    const webp = await sharp(buf)
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
    return NextResponse.json({ error: e?.message ?? 'Upload gagal' }, { status: 500 })
  }
}
