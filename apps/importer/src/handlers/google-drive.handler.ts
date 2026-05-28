import { google } from 'googleapis'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createWriteStream } from 'fs'
import pLimit from 'p-limit'
import got from 'got'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  path: string
}

function hasServiceAccount(): boolean {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  return !!key && key !== 'placeholder'
}

function getApiKey(): string | undefined {
  const key = process.env.GOOGLE_DRIVE_API_KEY
  return key && key !== 'placeholder' ? key : undefined
}

async function getAuthClient() {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!
  const keyJson = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'))
  const auth = new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return auth.getClient()
}

async function listFilesWithApiKey(folderId: string, apiKey: string, parentPath = ''): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType,size)',
      pageSize: '100',
      key: apiKey,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await got(
      `https://www.googleapis.com/drive/v3/files?${params}`
    ).json<any>()

    for (const file of response.files || []) {
      const filePath = parentPath ? `${parentPath}/${file.name}` : file.name
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        files.push(...await listFilesWithApiKey(file.id, apiKey, filePath))
      } else {
        files.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          path: filePath,
        })
      }
    }

    pageToken = response.nextPageToken
  } while (pageToken)

  return files
}

async function listFilesWithServiceAccount(folderId: string, parentPath = ''): Promise<DriveFile[]> {
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
        files.push(...await listFilesWithServiceAccount(file.id!, filePath))
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

export async function listDriveFiles(folderId: string, parentPath = ''): Promise<DriveFile[]> {
  const apiKey = getApiKey()
  if (apiKey) return listFilesWithApiKey(folderId, apiKey, parentPath)
  if (hasServiceAccount()) return listFilesWithServiceAccount(folderId, parentPath)

  throw new Error(
    'Defina GOOGLE_DRIVE_API_KEY (pasta pública) ou GOOGLE_SERVICE_ACCOUNT_KEY (pasta privada).',
  )
}

async function downloadWithServiceAccount(fileId: string, destPath: string): Promise<void> {
  const authClient = await getAuthClient()
  const drive = google.drive({ version: 'v3', auth: authClient as any })
  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
  return new Promise((resolve, reject) => {
    const writer = createWriteStream(destPath)
    ;(response.data as any).pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

async function downloadPublic(fileId: string, destPath: string): Promise<void> {
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`
  return new Promise((resolve, reject) => {
    const writer = createWriteStream(destPath)
    got.stream(url).pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

export async function downloadDriveFile(fileId: string, destPath: string): Promise<void> {
  await fs.mkdir(path.dirname(destPath), { recursive: true })
  if (hasServiceAccount()) {
    return downloadWithServiceAccount(fileId, destPath)
  }
  return downloadPublic(fileId, destPath)
}

export async function downloadDriveFiles(
  files: DriveFile[],
  tmpDir: string,
  concurrency = 5,
  onProgress?: (done: number, total: number, current: string) => void,
): Promise<Array<{ id: string; name: string; localPath: string; path: string; mimeType: string }>> {
  const limit = pLimit(concurrency)
  let done = 0

  return Promise.all(
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
}
