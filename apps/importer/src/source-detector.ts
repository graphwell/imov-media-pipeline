export type DetectedSource =
  | { type: 'GOOGLE_DRIVE'; folderId: string; isPublic: boolean }
  | { type: 'DROPBOX'; sharedLink: string }
  | { type: 'ONEDRIVE'; shareUrl: string }
  | { type: 'WETRANSFER'; transferUrl: string }
  | { type: 'S3_URL'; bucket: string; prefix: string; region: string }
  | { type: 'HTTP_URL'; url: string; isZip: boolean }
  | { type: 'ZIP_UPLOAD'; filePath: string }
  | { type: 'DIRECT_UPLOAD'; keys: string[] }
  | { type: 'FTP'; host: string; path: string }

export function detectSource(input: string | string[]): DetectedSource {
  if (Array.isArray(input)) {
    return { type: 'DIRECT_UPLOAD', keys: input }
  }

  const url = input.trim()

  const gdrive = url.match(/drive\.google\.com\/(drive\/folders\/|file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/)
  if (gdrive) return { type: 'GOOGLE_DRIVE', folderId: gdrive[2], isPublic: true }

  if (url.includes('dropbox.com/sh/') || url.includes('dropbox.com/scl/')) {
    return { type: 'DROPBOX', sharedLink: url }
  }

  if (url.includes('onedrive.live.com') || url.includes('sharepoint.com') || url.includes('1drv.ms')) {
    return { type: 'ONEDRIVE', shareUrl: url }
  }

  if (url.includes('wetransfer.com/downloads/') || url.includes('we.tl/')) {
    return { type: 'WETRANSFER', transferUrl: url }
  }

  const s3 = url.match(/https?:\/\/([^.]+)\.s3\.amazonaws\.com\/(.+)/)
  if (s3) return { type: 'S3_URL', bucket: s3[1], prefix: s3[2], region: 'us-east-1' }

  if (url.match(/\.(zip|tar\.gz|tar|7z|rar)(\?.*)?$/i)) {
    return { type: 'HTTP_URL', url, isZip: true }
  }

  if (url.startsWith('ftp://') || url.startsWith('sftp://')) {
    const ftpUrl = new URL(url)
    return { type: 'FTP', host: ftpUrl.host, path: ftpUrl.pathname }
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { type: 'HTTP_URL', url, isZip: false }
  }

  throw new Error(`Formato de fonte não reconhecido: ${url}`)
}
