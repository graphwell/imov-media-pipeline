import type { SourceType, PerfilVersao } from './enums'

export interface VerifySourceJobData {
  importacaoId: string
  sourceType: SourceType
  sourceUrl?: string
  sourceMeta?: Record<string, unknown>
}

export interface DownloadFilesJobData {
  importacaoId: string
  arquivos: Array<{
    id: string
    nomeOriginal: string
    downloadUrl: string
    tamanho?: number
    mimeType?: string
  }>
}

export interface ClassifyFileJobData {
  arquivoId: string
  importacaoId: string
  filePath: string
  nomeOriginal: string
  extensao: string
  caminhoOriginal?: string
}

export interface ProcessImageJobData {
  arquivoId: string
  mediaId: string
  empreendimentoId: string
  filePath: string
  focalPoint?: { x: number; y: number }
  profiles?: PerfilVersao[]
}

export interface ProcessVideoJobData {
  arquivoId: string
  mediaId: string
  empreendimentoId: string
  filePath: string
}

export interface ExtractPdfJobData {
  arquivoId: string
  documentoId: string
  empreendimentoId: string
  filePath: string
  nomeOriginal: string
}

export interface UploadToR2JobData {
  mediaId?: string
  documentoId?: string
  empreendimentoId: string
  localFiles: Array<{
    perfil: PerfilVersao | 'ORIGINAL' | 'PDF'
    localPath: string
    destKey: string
  }>
}

export interface PublishEmpreendimentoJobData {
  empreendimentoId: string
  importacaoId?: string
  notifyMainSite: boolean
}
