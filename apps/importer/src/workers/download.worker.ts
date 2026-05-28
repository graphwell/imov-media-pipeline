import { Job, Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { downloadDriveFile } from '../handlers/google-drive.handler'
import { downloadFile as downloadHttp } from '../handlers/http.handler'
import * as fs from 'fs/promises'
import * as path from 'path'

const prisma = new PrismaClient()

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
})

const queue = new Queue('importacao', { connection: redisConnection })

export async function downloadFileWorker(job: Job) {
  const { arquivoId, importacaoId, sourceType, driveFileId, sourceUrl, localPath } = job.data

  await prisma.arquivo.update({
    where: { id: arquivoId },
    data: { status: 'BAIXANDO' },
  })

  try {
    await fs.mkdir(path.dirname(localPath), { recursive: true })

    if (sourceType === 'GOOGLE_DRIVE' && driveFileId) {
      await downloadDriveFile(driveFileId, localPath)
    } else if (sourceUrl) {
      await downloadHttp(sourceUrl, localPath)
    } else {
      throw new Error(`Fonte não identificada: sourceType=${sourceType}`)
    }

    const stat = await fs.stat(localPath)

    await prisma.arquivo.update({
      where: { id: arquivoId },
      data: {
        status: 'BAIXADO',
        tamanho: BigInt(stat.size),
      },
    })

    await job.updateProgress({ arquivoId, localPath, size: stat.size })

    // Verifica se todos os arquivos da importação foram baixados
    const pendentes = await prisma.arquivo.count({
      where: {
        importacaoId,
        status: { in: ['PENDENTE', 'BAIXANDO'] },
      },
    })

    if (pendentes === 0) {
      console.log(`[DOWNLOAD] Todos os arquivos baixados para ${importacaoId}. Enfileirando classify-import.`)
      await prisma.importacao.update({
        where: { id: importacaoId },
        data: { status: 'CLASSIFICANDO', etapaAtual: 'Download concluído. Classificando...' },
      })
      await queue.add('classify-import', { importacaoId })
    }

    return { arquivoId, localPath, size: stat.size }

  } catch (err: any) {
    await prisma.arquivo.update({
      where: { id: arquivoId },
      data: { status: 'ERRO' },
    })
    throw err
  }
}
