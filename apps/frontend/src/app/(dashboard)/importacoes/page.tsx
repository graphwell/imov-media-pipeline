'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { importacoesApi } from '@/lib/api'
import { Plus, RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  AGUARDANDO: { label: 'Aguardando', color: 'text-gray-600', icon: <Clock size={14} /> },
  VERIFICANDO_FONTE: { label: 'Verificando', color: 'text-blue-600', icon: <Loader2 size={14} className="animate-spin" /> },
  BAIXANDO: { label: 'Baixando', color: 'text-blue-600', icon: <Loader2 size={14} className="animate-spin" /> },
  CLASSIFICANDO: { label: 'Classificando', color: 'text-purple-600', icon: <Loader2 size={14} className="animate-spin" /> },
  PROCESSANDO_MIDIA: { label: 'Processando', color: 'text-orange-600', icon: <Loader2 size={14} className="animate-spin" /> },
  CONCLUIDO: { label: 'Concluído', color: 'text-green-600', icon: <CheckCircle size={14} /> },
  ERRO: { label: 'Erro', color: 'text-red-600', icon: <XCircle size={14} /> },
  CANCELADO: { label: 'Cancelado', color: 'text-gray-400', icon: <XCircle size={14} /> },
}

export default function ImportacoesPage() {
  const [importacoes, setImportacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const { data } = await importacoesApi.listar()
      setImportacoes(data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importações</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie todas as importações de mídia</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
            <RefreshCw size={16} /> Atualizar
          </button>
          <Link href="/dashboard/importacoes/nova" className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Nova Importação
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : importacoes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">Nenhuma importação ainda.</p>
          <Link href="/dashboard/importacoes/nova" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline">
            <Plus size={16} /> Criar primeira importação
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {importacoes.map((imp: any) => {
            const config = STATUS_CONFIG[imp.status] || STATUS_CONFIG.AGUARDANDO
            return (
              <Link
                key={imp.id}
                href={`/dashboard/importacoes/${imp.id}`}
                className="block bg-white rounded-xl border hover:border-blue-300 hover:shadow-sm p-5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-sm font-medium ${config.color}`}>
                        {config.icon} {config.label}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{imp.sourceType}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1 truncate max-w-lg">{imp.sourceUrl || 'Upload direto'}</p>
                    {imp.empreendimento && (
                      <p className="text-blue-600 text-xs mt-1">{imp.empreendimento.nome}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{imp.totalArquivos} arquivos</p>
                    <p className="text-xs">{new Date(imp.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                {imp.progresso > 0 && imp.status !== 'CONCLUIDO' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{imp.etapaAtual}</span>
                      <span>{imp.progresso}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${imp.progresso}%` }} />
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
