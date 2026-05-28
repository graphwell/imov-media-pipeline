import { Job, Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { detectSource } from '../source-detector'
import { listDriveFiles } from '../handlers/google-drive.handler'
import { getFileSizeFromUrl } from '../handlers/http.handler'
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

export async function verifySource(job: Job) {
  const { importacaoId, sourceType, sourceUrl } = job.data

  await prisma.importacao.update({
    where: { id: importacaoId },
    data: { status: 'VERIFICANDO_FONTE', etapaAtual: 'Verificando fonte...' },
  })

  await job.updateProgress({ step: 'verify', progresso: 5 })

  let totalArquivos = 0
  let arquivos: any[] = []
  // Drive: mapeia "nome:caminho" → driveFileId para uso no job de download
  const driveFileMap = new Map<string, string>()

  try {
    if (sourceType === 'GOOGLE_DRIVE' && sourceUrl) {
      const source = detectSource(sourceUrl) as any
      const files = await listDriveFiles(source.folderId)
      totalArquivos = files.length

      for (const f of files) {
        driveFileMap.set(`${f.name}:${f.path}`, f.id)
      }

      await prisma.importacao.update({
        where: { id: importacaoId },
        data: { totalArquivos, status: 'BAIXANDO', etapaAtual: `${totalArquivos} arquivos encontrados` },
      })

      arquivos = files.map(f => ({
        nomeOriginal: f.name,
        caminhoOriginal: f.path,
        extensao: f.name.split('.').pop()?.toLowerCase() || '',
        mimeType: f.mimeType,
        tamanho: f.size ? BigInt(f.size) : null,
        status: 'PENDENTE',
        importacaoId,
      }))

    } else if (sourceType === 'HTTP_URL' && sourceUrl) {
      const size = await getFileSizeFromUrl(sourceUrl)
      const filename = sourceUrl.split('/').pop()?.split('?')[0] || 'arquivo'
      totalArquivos = 1

      await prisma.importacao.update({
        where: { id: importacaoId },
        data: { totalArquivos: 1, status: 'BAIXANDO', etapaAtual: 'Baixando arquivo...' },
      })

      arquivos = [{
        nomeOriginal: filename,
        caminhoOriginal: sourceUrl,
        extensao: filename.split('.').pop()?.toLowerCase() || '',
        tamanho: size ? BigInt(size) : null,
        status: 'PENDENTE',
        importacaoId,
      }]

    } else if (sourceType === 'DIRECT_UPLOAD') {
      const keys: string[] = job.data.keys || []
      totalArquivos = keys.length

      await prisma.importacao.update({
        where: { id: importacaoId },
        data: { totalArquivos, status: 'CLASSIFICANDO', etapaAtual: `${totalArquivos} arquivos recebidos` },
      })

      arquivos = keys.map(key => ({
        nomeOriginal: key.split('/').pop() || key,
        extensao: key.split('.').pop()?.toLowerCase() || '',
        storageKey: key,
        status: 'PROCESSANDO',
        importacaoId,
      }))
    }

    if (arquivos.length > 0) {
      await prisma.arquivo.createMany({ data: arquivos })
    }

    // Enfileira download-file por arquivo (exceto DIRECT_UPLOAD que já está no R2)
    if (sourceType !== 'DIRECT_UPLOAD' && arquivos.length > 0) {
      const criados = await prisma.arquivo.findMany({
        where: { importacaoId, status: 'PENDENTE' },
        select: { id: true, nomeOriginal: true, caminhoOriginal: true },
      })

      for (const arq of criados) {
        const localPath = path.join(TMP_DIR, importacaoId, arq.caminhoOriginal)

        if (sourceType === 'GOOGLE_DRIVE') {
          const driveFileId = driveFileMap.get(`${arq.nomeOriginal}:${arq.caminhoOriginal}`)
          await queue.add('download-file', {
            arquivoId: arq.id,
            importacaoId,
            sourceType,
            driveFileId,
            localPath,
          })
        } else if (sourceType === 'HTTP_URL') {
          await queue.add('download-file', {
            arquivoId: arq.id,
            importacaoId,
            sourceType,
            sourceUrl: arq.caminhoOriginal,
            localPath,
          })
        }
      }

      console.log(`[VERIFY] ${criados.length} jobs download-file enfileirados para importação ${importacaoId}`)
    }

    if (sourceType === 'DIRECT_UPLOAD') {
      await queue.add('classify-import', { importacaoId })
    }

    await job.updateProgress({ step: 'verified', progresso: 20, totalArquivos })
    return { importacaoId, totalArquivos, sourceType }

  } catch (err: any) {
    await prisma.importacao.update({
      where: { id: importacaoId },
      data: { status: 'ERRO', etapaAtual: `Erro: ${err.message}` },
    })
    throw err
  }
}
