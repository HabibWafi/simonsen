/** Bound actual streamed bytes, including requests without Content-Length. */
export class RequestBodyError extends Error {
  constructor(message: string, public readonly status: number) { super(message) }
}

export async function readBody(req: Request, maxBytes: number): Promise<Buffer> {
  const encoding = req.headers.get('content-encoding')
  if (encoding && encoding.toLowerCase() !== 'identity') {
    throw new RequestBodyError('Content-Encoding tidak didukung', 415)
  }
  const length = req.headers.get('content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    throw new RequestBodyError('Ukuran request melebihi batas', 413)
  }
  if (!req.body) return Buffer.alloc(0)
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new RequestBodyError('Ukuran request melebihi batas', 413)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks, size)
}

export async function readJson(req: Request, maxBytes = 4 * 1024 * 1024): Promise<unknown> {
  try {
    return JSON.parse((await readBody(req, maxBytes)).toString('utf8'))
  } catch (error) {
    if (error instanceof RequestBodyError) throw error
    throw new RequestBodyError('JSON tidak valid', 400)
  }
}

export async function readFormData(req: Request, maxBytes: number): Promise<FormData> {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    throw new RequestBodyError('Gunakan multipart/form-data', 415)
  }
  const body = await readBody(req, maxBytes)
  try {
    return await new Response(new Uint8Array(body), { headers: { 'Content-Type': contentType } }).formData()
  } catch { throw new RequestBodyError('Form upload tidak valid', 400) }
}
