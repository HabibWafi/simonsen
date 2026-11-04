import * as yauzl from 'yauzl'
import { readFormData, RequestBodyError } from '../request-body'

export const MAX_EXCEL_BYTES = 20 * 1024 * 1024
const MAX_EXPANDED_BYTES = 100 * 1024 * 1024

/** Validate both ZIP metadata and the actual inflated bytes before SheetJS parses XML. */
export function validateWorkbookArchive(buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) { reject(new RequestBodyError('File XLSX tidak valid', 400)); return }
      let expanded = 0
      let declared = 0
      let entries = 0
      let hasWorkbook = false
      let failed = false
      const fail = () => {
        if (failed) return
        failed = true
        zip.close()
        reject(new RequestBodyError('Arsip XLSX tidak valid atau melewati batas ekstraksi 100MB/2048 entri', 400))
      }
      zip.on('error', fail)
      zip.on('entry', entry => {
        declared += entry.uncompressedSize
        if (++entries > 2048 || declared > MAX_EXPANDED_BYTES || (entry.generalPurposeBitFlag & 1)) { fail(); return }
        if (entry.fileName === 'xl/workbook.xml') hasWorkbook = true
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) { fail(); return }
          stream.on('error', fail)
          stream.on('data', (chunk: Buffer) => {
            expanded += chunk.length
            if (expanded > MAX_EXPANDED_BYTES) { stream.destroy(); fail() }
          })
          stream.on('end', () => { if (!failed) zip.readEntry() })
        })
      })
      zip.on('end', () => {
        if (failed) return
        if (!hasWorkbook) { fail(); return }
        resolve()
      })
      zip.readEntry()
    })
  })
}

export async function readExcelUpload(req: Request): Promise<{ file: File; buffer: Buffer }> {
  const form = await readFormData(req, MAX_EXCEL_BYTES + 64 * 1024)
  const file = form.get('file')
  if (!(file instanceof File) || !/\.xlsx$/i.test(file.name) || !file.size || file.size > MAX_EXCEL_BYTES) {
    throw new RequestBodyError('Gunakan file .xlsx tidak kosong, maksimal 20MB', 400)
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  await validateWorkbookArchive(buffer)
  return { file, buffer }
}
