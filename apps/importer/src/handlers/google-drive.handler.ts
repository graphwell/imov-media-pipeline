import { google } from 'googleapis'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createWriteStream } from 'fs'
import pLimit from 'p-limit'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  path: string
}

async function getAuthClient() {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ''
  if (!keyBase64 || keyBase64 === 'placeholder') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurado')
  }

  const keyJson = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'))
  const auth = new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return auth.getClient()
}

export async function listDriveFiles(folderId: string, parentPath = ''): Promise<DriveFile[]> {
  const authClient = await getAuthClient()
  const drive = google.drive({ version: 'v3', auth: authClient as any })

  const files: DriveFile[] = []

  let pageToken: string | undefined
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size)',
      pageSize: 100,
      pageToken,
    })

    for (const file of response.data.files || []) {
      const filePath = parentPath ? `${parentPath}/${file.name}` : file.name!

      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const subFiles = await listDriveFiles(file.id!, filePath)
        files.push(...subFiles)
      } else {
        files.push({
          id: file.id!,
          name: file.name!,
          mimeType: file.mimeType!,
          size: file.size || undefined,
          path: filePath,
        })
      }
    }

    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)

  return files
}

export async function downloadDriveFile(fileId: string, destPath: string): Promise<void> {
  const authClient = await getAuthClient()
  const drive = google.drive({ version: 'v3', auth: authClient as any })

  await fs.mkdir(path.dirname(destPath), { recursive: true })

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  )

  return new Promise((resolve, reject) => {
    const writer = createWriteStream(destPath)
    response.data.pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

export async function downloadDriveFiles(
  files: DriveFile[],
  tmpDir: string,
  concurrency = 5,
  onProgress?: (done: number, total: number, current: string) => void,
): Promise<Array<{ id: string; name: string; localPath: string; path: string; mimeType: string }>> {
  const limit = pLimit(concurrency)
  let done = 0

  const results = await Promise.all(
    files.map(file =>
      limit(async () => {
        const localPath = path.join(tmpDir, file.path.replace(/[/\\]/g, path.sep))
        await downloadDriveFile(file.id, localPath)
        done++
        onProgress?.(done, files.length, file.name)
        return { id: file.id, name: file.name, localPath, path: file.path, mimeType: file.mimeType }
      })
    )
  )

  return results
}
