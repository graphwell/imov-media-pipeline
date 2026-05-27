'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { importacoesApi } from '@/lib/api'
import { useImportProgress } from '@/hooks/useImportProgress'
import { CheckCircle, XCircle, Loader2, ArrowLeft, Building2 } from 'lucide-react'

export default function ImportacaoDetalhe() {
  const { id } = useParams()
  const router = useRouter()
  const [importacao, setImportacao] = useState<any>(null)
  const { progress, completed, error: wsError } = useImportProgress(id as string)

  useEffect(() => {
    if (id) {
      importacoesApi.buscar(id as string)
        .then(({ data }) => setImportacao(data))
        .catch(console.error)
    }
  }, [id])

  useEffect(() => {
    if (progress) {
      setImportacao((prev: any) => prev ? { ...prev, ...progress } : prev)
    }
  }, [progress])

  useEffect(() => {
    if (completed?.empreendimentoId) {
      setTimeout(() => router.push(`/dashboard/empreendimentos/${completed.empreendimentoId}`), 2000)
    }
  }, [completed, router])

  if (!importacao) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  const isActive = !['CONCLUIDO', 'ERRO', 'CANCELADO'].includes(importacao.status)
  const isDone = importacao.status === 'CONCLUIDO'
  const isError = importacao.status === 'ERRO'

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/dashboard/importacoes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Voltar para importações
      </Link>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-6">
          {isDone ? (
            <CheckCircle size={24} className="text-green-500" />
          ) : isError ? (
            <XCircle size={24} className="text-red-500" />
          ) : (
            <Loader2 size={24} className="animate-spin text-blue-500" />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isDone ? 'Importação Concluída' : isError ? 'Erro na Importação' : 'Importação em Progresso'}
            </h1>
            <p className="text-sm text-gray-500">{importacao.sourceType} • {importacao.sourceUrl || 'Upload direto'}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{importacao.etapaAtual || 'Aguardando...'}</span>
            <span>{importacao.progresso || 0}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${importacao.progresso || 0}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{importacao.totalArquivos}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{importacao.processados}</div>
            <div className="text-xs text-gray-500">Processados</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{importacao.erros}</div>
            <div className="text-xs text-gray-500">Erros</div>
          </div>
        </div>

        {/* Completed action */}
        {isDone && importacao.empreendimentoId && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">Importação concluída com sucesso!</p>
            <Link
              href={`/dashboard/empreendimentos/${importacao.empreendimentoId}`}
              className="mt-2 inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
            >
              <Building2 size={16} /> Ver empreendimento criado
            </Link>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="mt-4">
            <button
              onClick={() => importacoesApi.retry(id as string).then(() => window.location.reload())}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
