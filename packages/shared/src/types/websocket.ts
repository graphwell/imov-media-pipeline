import type { ImportStatus } from './enums'
import type { ImportacaoResumo } from './entities'

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
