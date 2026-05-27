'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { empreendimentosApi } from '@/lib/api'
import { Plus, Building2, Loader2, Eye, Edit } from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  EM_REVISAO: 'bg-yellow-100 text-yellow-700',
  PUBLICADO: 'bg-green-100 text-green-700',
  ARQUIVADO: 'bg-red-100 text-red-700',
}

export default function EmpreendimentosPage() {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    empreendimentosApi.listar()
      .then(({ data }) => setEmpreendimentos(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empreendimentos</h1>
          <p className="text-sm text-gray-500 mt-1">Todos os empreendimentos imobiliários</p>
        </div>
        <Link href="/dashboard/importacoes/nova" className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Importar mídia
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : empreendimentos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhum empreendimento ainda.</p>
          <Link href="/dashboard/importacoes/nova" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline">
            <Plus size={16} /> Importar primeiro projeto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empreendimentos.map((emp: any) => (
            <div key={emp.id} className="bg-white rounded-xl border hover:shadow-md transition-shadow overflow-hidden">
              {/* Capa */}
              {emp.medias?.[0]?.versoes?.[0]?.url ? (
                <img src={emp.medias[0].versoes[0].url} alt={emp.nome} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Building2 size={32} className="text-blue-400" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{emp.nome}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[emp.status]}`}>
                    {emp.status}
                  </span>
                </div>
                {emp.construtora && <p className="text-xs text-gray-500 mt-1">{emp.construtora}</p>}
                {emp.cidade && <p className="text-xs text-gray-400">{emp.cidade}, {emp.estado}</p>}
                <div className="flex gap-2 mt-3">
                  <p className="text-xs text-gray-400">{emp._count?.medias || 0} mídias</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link href={`/dashboard/empreendimentos/${emp.id}`} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border rounded-lg hover:border-blue-400 hover:text-blue-600">
                    <Edit size={12} /> Editar
                  </Link>
                  {emp.status === 'PUBLICADO' && (
                    <a href={`https://imov.somar.ia.br/empreendimentos/${emp.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs py-1.5 px-3 border rounded-lg hover:border-green-400 hover:text-green-600">
                      <Eye size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
