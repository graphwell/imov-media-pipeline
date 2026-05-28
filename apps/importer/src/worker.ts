import 'dotenv/config'
import { Worker, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { verifySource } from './workers/verify-source.worker'
import { downloadFileWorker } from './workers/download.worker'
import { detectSource } from './source-detector'
import { downloadFile, extractZip } from './handlers/http.handler'
import { downloadDriveFiles, listDriveFiles } from './handlers/google-drive.handler'
import * as path from 'path'
import * as fs from 'fs/promises'
import pLimit from 'p-limit'

const prisma = new PrismaClient()
const TMP_DIR = process.env.TMP_DIR || '/tmp/media-processing'
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_DOWNLOADS) || 5

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
})

const worker = new Worker(
  'importacao',
  async (job) => {
    console.log(`[IMPORTER] Job ${job.name} iniciado: ${job.id}`)

    switch (job.name) {
      case 'verify-source':
        return verifySource(job)

      case 'download-file':
        return downloadFileWorker(job)

      case 'download-files': {
        const { importacaoId, sourceType, sourceUrl } = job.data
        const tmpDir = path.join(TMP_DIR, importacaoId)
        await fs.mkdir(tmpDir, { recursive: true })

        await prisma.importacao.update({
          where: { id: importacaoId },
          data: { status: 'BAIXANDO', etapaAtual: 'Baixando arquivos...' },
        })

        if (sourceType === 'GOOGLE_DRIVE' && sourceUrl) {
          const source = detectSource(sourceUrl) as any
          const files = await listDriveFiles(source.folderId)

          await downloadDriveFiles(files, tmpDir, MAX_CONCURRENT, async (done, total, current) => {
            const progresso = Math.round(20 + (done / total) * 40)
            await prisma.importacao.update({
              where: { id: importacaoId },
              data: { progresso, processados: done, etapaAtual: `Baixando: ${current}` },
            })
            await job.updateProgress({ progresso, arquivoAtual: current })
          })
        } else if (sourceType === 'HTTP_URL' && sourceUrl) {
          const filename = sourceUrl.split('/').pop()?.split('?')[0] || 'arquivo'
          const destPath = path.join(tmpDir, filename)
          await downloadFile(sourceUrl, destPath)

          if (destPath.match(/\.(zip|tar\.gz|7z|rar)$/i)) {
            await extractZip(destPath, tmpDir)
          }

          await prisma.importacao.update({
            where: { id: importacaoId },
            data: { progresso: 60, processados: 1, etapaAtual: 'Download concluído' },
          })
        }

        return { importacaoId, tmpDir, status: 'downloaded' }
      }

      case 'process-direct-upload': {
        const { importacaoId, keys } = job.data
        await prisma.importacao.update({
          where: { id: importacaoId },
          data: { status: 'CLASSIFICANDO', etapaAtual: 'Processando arquivos enviados...' },
        })
        return { importacaoId, keys }
      }

      default:
        console.log(`[IMPORTER] Job desconhecido: ${job.name}`)
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
)

worker.on('completed', (job) => {
  console.log(`[IMPORTER] Job ${job.id} concluído`)
})

worker.on('failed', (job, err) => {
  console.error(`[IMPORTER] Job ${job?.id} falhou:`, err.message)
})

process.on('SIGTERM', async () => {
  await worker.close()
  await prisma.$disconnect()
  redisConnection.disconnect()
})

console.log('[IMPORTER] Worker iniciado e aguardando jobs...')
