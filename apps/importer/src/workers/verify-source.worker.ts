import { Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { detectSource } from '../source-detector'
import { listDriveFiles } from '../handlers/google-drive.handler'
import { getFileSizeFromUrl } from '../handlers/http.handler'

const prisma = new PrismaClient()

export async function verifySource(job: Job) {
  const { importacaoId, sourceType, sourceUrl, config } = job.data

  await prisma.importacao.update({
    where: { id: importacaoId },
    data: { status: 'VERIFICANDO_FONTE', etapaAtual: 'Verificando fonte...' },
  })

  await job.updateProgress({ step: 'verify', progresso: 5 })

  let totalArquivos = 0
  let arquivos: any[] = []

  try {
    if (sourceType === 'GOOGLE_DRIVE' && sourceUrl) {
      const source = detectSource(sourceUrl) as any
      const files = await listDriveFiles(source.folderId)
      totalArquivos = files.length

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
