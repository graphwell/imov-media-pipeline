'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { empreendimentosApi, mediasApi } from '@/lib/api'
import Link from 'next/link'
import { Globe, Loader2, CheckCircle, Image, Video, FileText } from 'lucide-react'

const CATEGORIA_LABELS: Record<string, string> = {
  FACHADA: 'Fachada', AREA_DE_LAZER: 'Lazer', PISCINA: 'Piscina',
  PLANTA_BAIXA: 'Planta Baixa', LOGO: 'Logo', BANNER: 'Banner',
  QUARTO: 'Quarto', SALA: 'Sala', COZINHA: 'Cozinha', VIDEO_TOUR: 'Vídeo Tour',
  PDF_FOLDER: 'Folder', OUTRO: 'Outro',
}

export default function EmpreendimentoPage() {
  const { id } = useParams()
  const [emp, setEmp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      empreendimentosApi.buscar(id as string)
        .then(({ data }) => setEmp(data))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [id])

  async function handlePublish() {
    setPublishing(true)
    try {
      await empreendimentosApi.publicar(id as string)
      setEmp((prev: any) => ({ ...prev, status: 'PUBLICADO' }))
    } catch (err) {
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
  if (!emp) return <div className="p-8 text-red-500">Empreendimento não encontrado</div>

  const medias = emp.medias || []
  const categorias = [...new Set(medias.map((m: any) => m.categoria))] as string[]
  const filtered = selectedCategoria ? medias.filter((m: any) => m.categoria === selectedCategoria) : medias

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{emp.nome}</h1>
          <p className="text-gray-500 mt-1">{emp.construtora} • {emp.cidade}, {emp.estado}</p>
        </div>
        {emp.status !== 'PUBLICADO' ? (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            {publishing ? 'Publicando...' : 'Publicar no Site'}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle size={18} /> Publicado
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Mídias" value={medias.length} icon={<Image size={20} />} color="blue" />
        <StatCard label="Imagens" value={medias.filter((m: any) => m.tipo === 'IMAGE').length} icon={<Image size={20} />} color="purple" />
        <StatCard label="Vídeos" value={medias.filter((m: any) => m.tipo === 'VIDEO').length} icon={<Video size={20} />} color="orange" />
        <StatCard label="Documentos" value={medias.filter((m: any) => m.tipo === 'PDF').length} icon={<FileText size={20} />} color="green" />
      </div>

      {/* Filtro por categoria */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedCategoria(null)}
          className={`px-3 py-1 text-sm rounded-full ${!selectedCategoria ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todas ({medias.length})
        </button>
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategoria(cat === selectedCategoria ? null : cat)}
            className={`px-3 py-1 text-sm rounded-full ${selectedCategoria === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {CATEGORIA_LABELS[cat] || cat} ({medias.filter((m: any) => m.categoria === cat).length})
          </button>
        ))}
      </div>

      {/* Grid de mídias */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filtered.map((media: any) => {
          const thumbUrl = media.versoes?.find((v: any) => v.perfil === 'THUMBNAIL')?.url || media.originalUrl
          return (
            <Link key={media.id} href={`/medias/${media.id}`} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border hover:border-blue-400">
              {media.tipo === 'IMAGE' ? (
                <img src={thumbUrl} alt={media.altText || media.originalNome} className="w-full h-full object-cover" />
              ) : media.tipo === 'VIDEO' ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <Video size={24} className="text-white" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-red-50">
                  <FileText size={24} className="text-red-400" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {CATEGORIA_LABELS[media.categoria] || media.categoria}
              </div>
              {media.destaque && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhuma mídia encontrada para esta categoria.
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600', green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}
