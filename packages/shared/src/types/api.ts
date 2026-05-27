import type { SourceType, ImportStatus, CategoriaMedia, PerfilVersao, ClassificacaoMetodo } from './enums'
import type { ImportacaoResumo } from './entities'

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

export interface LoginDto {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string
    role: string
    organizationId: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
