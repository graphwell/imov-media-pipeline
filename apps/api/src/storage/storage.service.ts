import { Injectable } from '@nestjs/common'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createReadStream, statSync } from 'fs'
import * as path from 'path'

@Injectable()
export class StorageService {
  private client: S3Client
  private bucket: string
  private publicUrl: string

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID || 'placeholder'
    this.bucket = process.env.R2_BUCKET || 'imov-media'
    this.publicUrl = process.env.R2_PUBLIC_URL || 'https://media.imov.somar.ia.br'

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || 'placeholder',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'placeholder',
      },
    })
  }

  async upload(localPath: string, destKey: string, contentType?: string): Promise<string> {
    const fileStream = createReadStream(localPath)
    const stats = statSync(localPath)

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: destKey,
      Body: fileStream,
      ContentType: contentType || this.detectContentType(localPath),
      ContentLength: stats.size,
      CacheControl: 'public, max-age=31536000',
    }))

    return `${this.publicUrl}/${destKey}`
  }

  async uploadBuffer(buffer: Buffer, destKey: string, contentType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: destKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }))

    return `${this.publicUrl}/${destKey}`
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  async getSignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType })
    return getSignedUrl(this.client, command, { expiresIn })
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.client, command, { expiresIn })
  }

  async listObjects(prefix: string): Promise<string[]> {
    const response = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }))
    return (response.Contents || []).map(obj => obj.Key!).filter(Boolean)
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }

  buildKey(empreendimentoId: string, tipo: string, mediaId: string, filename: string): string {
    return `empreendimentos/${empreendimentoId}/${tipo}/${mediaId}/${filename}`
  }

  private detectContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const types: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4',
      '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
      '.pdf': 'application/pdf', '.m3u8': 'application/x-mpegURL',
      '.ts': 'video/MP2T',
    }
    return types[ext] || 'application/octet-stream'
  }
}
