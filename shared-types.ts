// packages/shared/src/types/index.ts
// Tipos compartilhados entre todos os serviços

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Plan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER'

export type StatusEmpreendimento = 'RASCUNHO' | 'EM_REVISAO' | 'PUBLICADO' | 'ARQUIVADO'

export type ImportStatus =
  | 'AGUARDANDO'
  | 'VERIFICANDO_FONTE'
  | 'BAIXANDO'
  | 'EXTRAINDO'
  | 'CLASSIFICANDO'
  | 'PROCESSANDO_MIDIA'
  | 'REVISAO_MANUAL'
  | 'CONCLUIDO'
  | 'ERRO'
  | 'CANCELADO'

export type SourceType =
  | 'GOOGLE_DRIVE'
  | 'DROPBOX'
  | 'ONEDRIVE'
  | 'WETRANSFER'
  | 'S3_URL'
  | 'HTTP_URL'
  | 'ZIP_UPLOAD'
  | 'DIRECT_UPLOAD'
  | 'FTP'

export type TipoMedia = 'IMAGE' | 'VIDEO' | 'PDF' | 'DOCUMENT' | 'AUDIO'

export type CategoriaMedia =
  | 'FACHADA'
  | 'AREA_DE_LAZER'
  | 'PISCINA'
  | 'ACADEMIA'
  | 'SALAO_DE_FESTAS'
  | 'PLAYGROUND'
  | 'PLANTA_BAIXA'
  | 'PLANTA_HUMANIZADA'
  | 'PLANTA_3D'
  | 'LOGO'
  | 'BANNER'
  | 'POST_INSTAGRAM'
  | 'POST_FACEBOOK'
  | 'VIDEO_TOUR'
  | 'VIDEO_DRONE'
  | 'VIDEO_APRESENTACAO'
  | 'PDF_FOLDER'
  | 'PDF_MEMORIAL'
  | 'TABELA_PRECO'
  | 'DOCUMENTO_COMERCIAL'
  | 'QUARTO'
  | 'SALA'
  | 'COZINHA'
  | 'BANHEIRO'
  | 'VARANDA'
  | 'AREA_GOURMET'
  | 'VISTA'
  | 'MAPA_LOCALIZACAO'
  | 'OBRA'
  | 'OUTRO'

export type ClassificacaoMetodo =
  | 'NOME_ARQUIVO'
  | 'ESTRUTURA_PASTA'
  | 'IA_VISUAL'
  | 'OCR'
  | 'METADATA'
  | 'MANUAL'
  | 'COMBINADO'

export type PerfilVersao =
  | 'THUMBNAIL'
  | 'CARD'
  | 'BANNER'
  | 'MOBILE'
  | 'GALLERY'
  | 'FULLSCREEN'
  | 'SQUARE'
  | 'WEBP_ORIGINAL'
  | 'VIDEO_HLS'
  | 'VIDEO_MP4_LQ'
  | 'VIDEO_MP4_HQ'
  | 'VIDEO_THUMB'

export type StatusArquivo =
  | 'PENDENTE'
  | 'BAIXANDO'
  | 'PROCESSANDO'
  | 'CLASSIFICANDO'
  | 'CONCLUIDO'
  | 'ERRO'
  | 'IGNORADO'

// ─── Entidades ────────────────────────────────────────────────────────────────

export interface Empreendimento {
  id: string
  organizationId: string
  nome: string
  slug: string
  construtora?: string
  status: StatusEmpreendimento
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  endereco?: string
  latitude?: number
  longitude?: number
  tipoImovel?: string
  metragem?: { min: number; max: number; unidade: string }
  quartos?: { min: number; max: number }
  banheiros?: { min: number; max: number }
  vagas?: { min: number; max: number }
  andares?: number
  unidades?: number
  precoMin?: number
  precoMax?: number
  entrega?: string
  diferenciais: string[]
  descricao?: string
  descricaoIA?: string
  tags: string[]
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface Media {
  id: string
  empreendimentoId: string
  tipo: TipoMedia
  categoria: CategoriaMedia
  subcategoria?: string
  ordem: number
  destaque: boolean
  originalUrl: string
  originalNome: string
  originalTamanho?: number
  largura?: number
  altura?: number
  duracao?: number
  descricaoIA?: string
  altText?: string
  tagsIA: string[]
  focalPoint?: { x: number; y: number }
  sujeitoPrincipal?: string
  versoes: MediaVersao[]
  ativo: boolean
  createdAt: string
}

export interface MediaVersao {
  id: string
  mediaId: string
  perfil: PerfilVersao
  formato: string
  largura?: number
  altura?: number
  tamanho?: number
  qualidade?: number
  url: string
  cdn?: string
}

export interface Importacao {
  id: string
  organizationId: string
  empreendimentoId?: string
  sourceType: SourceType
  sourceUrl?: string
  status: ImportStatus
  progresso: number
  etapaAtual?: string
  totalArquivos: number
  processados: number
  erros: number
  resumo?: ImportacaoResumo
  logErros: ImportacaoErro[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ImportacaoResumo {
  images: number
  videos: number
  pdfs: number
  documentos: number
  outros: number
  totalTamanho: number
  duracaoMs: number
}

export interface ImportacaoErro {
  arquivo: string
  erro: string
  timestamp: string
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface WsProgressEvent {
  importacaoId: string
  status: ImportStatus
  progresso: number
  etapaAtual: string
  totalArquivos: number
  processados: number
  erros: number
  arquivoAtual?: string
  mensagem?: string
  timestamp: string
}

export interface WsCompletedEvent {
  importacaoId: string
  empreendimentoId: string
  resumo: ImportacaoResumo
  timestamp: string
}

export interface WsErrorEvent {
  importacaoId: string
  erro: string
  detalhe?: string
  timestamp: string
}

// ─── API Request/Response ─────────────────────────────────────────────────────

export interface CriarImportacaoDto {
  sourceType: SourceType
  sourceUrl?: string
  empreendimentoId?: string
  config?: {
    autoPublish?: boolean
    autoCreateEmpreendimento?: boolean
    processVideos?: boolean
    processPdfs?: boolean
    generateDescriptions?: boolean
    overwriteExisting?: boolean
  }
}

export interface CriarImportacaoResponse {
  id: string
  status: ImportStatus
  sourceType: SourceType
  progresso: number
  socketRoom: string
  estimatedFiles?: number
  estimatedTime?: number
}

export interface ClassificacaoIA {
  categoria: CategoriaMedia
  subcategoria?: string
  confianca: number
  sujeitoPrincipal?: string
  focalPoint?: { x: number; y: number }
  altText?: string
  tags: string[]
  qualidadeVisual?: number
  classificadoPor: ClassificacaoMetodo
}

export interface ExtracacaoPDFResult {
  nomeEmpreendimento?: string
  construtora?: string
  bairro?: string
  cidade?: string
  estado?: string
  metragem?: { min: number; max: number; unidade: string }
  quartos?: { min: number; max: number }
  banheiros?: { min: number; max: number }
  vagas?: { min: number; max: number }
  andares?: number
  unidades?: number
  precoMin?: number
  precoMax?: number
  entrega?: string
  diferenciais?: string[]
  descricaoComercial?: string
  tipoDocumento?: string
  confianca: number
}

// ─── Job Payloads ─────────────────────────────────────────────────────────────

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
