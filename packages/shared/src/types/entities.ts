import type {
  StatusEmpreendimento, TipoMedia, CategoriaMedia, PerfilVersao,
  ImportStatus, SourceType, StatusArquivo, ClassificacaoMetodo,
  TipoGaleria, TipoDocumento, Role, Plan,
} from './enums'

export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  settings: Record<string, unknown>
  plan: Plan
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  organizationId: string
  createdAt: string
  updatedAt: string
}

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
  seoTitle?: string
  seoDescription?: string
  tags: string[]
  medias?: Media[]
  galerias?: Galeria[]
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
  originalKey: string
  originalUrl: string
  originalNome: string
  originalTamanho?: number
  originalMime?: string
  largura?: number
  altura?: number
  duracao?: number
  fps?: number
  descricaoIA?: string
  altText?: string
  tagsIA: string[]
  focalPoint?: { x: number; y: number }
  sujeitoPrincipal?: string
  versoes: MediaVersao[]
  ativo: boolean
  createdAt: string
  updatedAt: string
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
  storageKey: string
  url: string
  cdn?: string
  createdAt: string
}

export interface Galeria {
  id: string
  empreendimentoId: string
  nome: string
  slug: string
  tipo: TipoGaleria
  ordem: number
  publica: boolean
  capa?: string
  medias?: GaleriaMedia[]
  createdAt: string
  updatedAt: string
}

export interface GaleriaMedia {
  id: string
  galeriaId: string
  mediaId: string
  ordem: number
}

export interface DocumentoEmpreendimento {
  id: string
  empreendimentoId: string
  tipo: TipoDocumento
  nome: string
  storageKey: string
  url: string
  tamanho?: number
  paginas?: number
  textoBruto?: string
  dadosExtraidos?: Record<string, unknown>
  ativo: boolean
  createdAt: string
}

export interface Importacao {
  id: string
  organizationId: string
  empreendimentoId?: string
  sourceType: SourceType
  sourceUrl?: string
  sourceMeta?: Record<string, unknown>
  status: ImportStatus
  progresso: number
  etapaAtual?: string
  totalArquivos: number
  processados: number
  erros: number
  resumo?: ImportacaoResumo
  logErros: ImportacaoErro[]
  jobIds: string[]
  arquivos?: Arquivo[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface Arquivo {
  id: string
  importacaoId: string
  nomeOriginal: string
  caminhoOriginal?: string
  extensao: string
  mimeType?: string
  tamanho?: number
  checksum?: string
  storageKey?: string
  storageUrl?: string
  categoria?: CategoriaMedia
  subcategoria?: string
  confianca?: number
  classificadoPor?: ClassificacaoMetodo
  status: StatusArquivo
  mediaId?: string
  erro?: string
  createdAt: string
  updatedAt: string
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
