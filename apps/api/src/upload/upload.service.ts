import { Injectable } from '@nestjs/common'
import { StorageService } from '../storage/storage.service'
import { QueueService } from '../queue/queue.service'
import { PrismaService } from '../prisma/prisma.service'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import * as fs from 'fs/promises'

@Injectable()
export class UploadService {
  constructor(
    private storage: StorageService,
    private queue: QueueService,
    private prisma: PrismaService,
  ) {}

  async getUploadUrl(organizationId: string, filename: string, contentType: string) {
    const key = `tmp/${organizationId}/${uuidv4()}/${filename}`
    const url = await this.storage.getSignedUploadUrl(key, contentType)
    return { uploadUrl: url, key, expiresIn: 3600 }
  }

  async createImportFromUpload(organizationId: string, keys: string[], empreendimentoId?: string) {
    const importacao = await this.prisma.importacao.create({
      data: {
        organizationId,
        empreendimentoId,
        sourceType: 'DIRECT_UPLOAD',
        status: 'AGUARDANDO',
        progresso: 0,
        totalArquivos: keys.length,
      },
    })

    await this.queue.importacao.add('process-direct-upload', {
      importacaoId: importacao.id,
      keys,
    })

    return { importacaoId: importacao.id, socketRoom: `import:${importacao.id}` }
  }
}
