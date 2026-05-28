import { Job, Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import * as path from 'path'

const prisma = new PrismaClient()
const TMP_DIR = process.env.TMP_DIR || '/tmp/media-processing'

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
})

const queue = new Queue('importacao', { connection: redisConnection })

export async function classifyImport(job: Job) {
  const { importacaoId } = job.data

  const arquivos = await prisma.arquivo.findMany({
    where: { importacaoId, status: 'BAIXADO' },
    select: { id: true, nomeOriginal: true, caminhoOriginal: true, mimeType: true },
  })

  if (arquivos.length === 0) {
    console.log(`[CLASSIFY-IMPORT] Nenhum arquivo BAIXADO para importação ${importacaoId}`)
    return { importacaoId, totalArquivos: 0 }
  }

  for (const arquivo of arquivos) {
    const filePath = path.join(TMP_DIR, importacaoId, arquivo.caminhoOriginal)
    await queue.add('classify-file', {
      arquivoId: arquivo.id,
      importacaoId,
      filePath,
      nomeOriginal: arquivo.nomeOriginal,
      caminhoOriginal: arquivo.caminhoOriginal,
      mimeType: arquivo.mimeType,
    })
  }

  await prisma.importacao.update({
    where: { id: importacaoId },
    data: { etapaAtual: `Classificando ${arquivos.length} arquivos...` },
  })

  console.log(`[CLASSIFY-IMPORT] ${arquivos.length} jobs classify-file enfileirados para ${importacaoId}`)
  return { importacaoId, totalArquivos: arquivos.length }
}
