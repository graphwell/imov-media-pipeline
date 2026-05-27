import got from 'got'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import unzipper from 'unzipper'
import * as crypto from 'crypto'

export async function downloadFile(url: string, destPath: string): Promise<{ size: number; checksum: string }> {
  await fs.mkdir(path.dirname(destPath), { recursive: true })

  const hash = crypto.createHash('sha256')
  let size = 0

  const response = got.stream(url, {
    headers: { 'User-Agent': 'IMOV-Media-Pipeline/1.0' },
    timeout: { request: 30000 },
    retry: { limit: 3 },
  })

  const writer = createWriteStream(destPath)

  response.on('data', (chunk: Buffer) => {
    hash.update(chunk)
    size += chunk.length
  })

  await pipeline(response, writer)
  return { size, checksum: hash.digest('hex') }
}

export async function extractZip(zipPath: string, destDir: string): Promise<string[]> {
  await fs.mkdir(destDir, { recursive: true })

  const extractedFiles: string[] = []

  await new Promise<void>((resolve, reject) => {
    createWriteStream(zipPath)
    require('fs').createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on('entry', async (entry: any) => {
        const filePath = entry.path
        const type = entry.type

        if (type === 'File') {
          const destPath = path.join(destDir, filePath)
          await fs.mkdir(path.dirname(destPath), { recursive: true })
          const writer = createWriteStream(destPath)
          entry.pipe(writer)
          extractedFiles.push(destPath)
        } else {
          entry.autodrain()
        }
      })
      .on('close', resolve)
      .on('error', reject)
  })

  return extractedFiles
}

export async function getFileSizeFromUrl(url: string): Promise<number | null> {
  try {
    const response = await got.head(url, { timeout: { request: 5000 } })
    const contentLength = response.headers['content-length']
    return contentLength ? Number(contentLength) : null
  } catch {
    return null
  }
}
