'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { mediasApi } from '@/lib/api'
import { ArrowLeft, Loader2, Save, Trash2, RefreshCw, Star, StarOff } from 'lucide-react'

const CATEGORIA_OPTIONS = [
  { value: 'FACHADA', label: 'Fachada' },
  { value: 'AREA_DE_LAZER', label: 'Área de Lazer' },
  { value: 'PISCINA', label: 'Piscina' },
  { value: 'PLANTA_BAIXA', label: 'Planta Baixa' },
  { value: 'LOGO', label: 'Logo' },
  { value: 'BANNER', label: 'Banner' },
  { value: 'QUARTO', label: 'Quarto' },
  { value: 'SALA', label: 'Sala' },
  { value: 'COZINHA', label: 'Cozinha' },
  { value: 'VIDEO_TOUR', label: 'Vídeo Tour' },
  { value: 'PDF_FOLDER', label: 'Folder PDF' },
  { value: 'OUTRO', label: 'Outro' },
]

export default function MediaDetalhe() {
  const { id } = useParams()
  const router = useRouter()
  const [media, setMedia] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [form, setForm] = useState({ altText: '', categoria: '', destaque: false, ordem: 0 })

  useEffect(() => {
    if (id) {
      mediasApi.atualizar(id as string, {})
        .then(({ data }) => {
          setMedia(data)
          setForm({
            altText: data.altText || '',
            categoria: data.categoria || '',
            destaque: data.destaque || false,
            ordem: data.ordem || 0,
          })
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      const { data } = await mediasApi.atualizar(id as string, form)
      setMedia(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      await mediasApi.regenerar(id as string)
    } catch (err) {
      console.error(err)
    } finally {
      setRegenerating(false)
    }
  }

  async function handleRemove() {
    if (!confirm('Remover esta mídia permanentemente?')) return
    setRemoving(true)
    try {
      await mediasApi.remover(id as string)
      if (media?.empreendimentoId) {
        router.push(`/dashboard/empreendimentos/${media.empreendimentoId}`)
      } else {
        router.push('/dashboard/empreendimentos')
      }
    } catch (err) {
      console.error(err)
      setRemoving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  )

  if (!media) return (
    <div className="p-8 text-red-500">Mídia não encontrada.</div>
  )

  const thumbUrl = media.versoes?.find((v: any) => v.perfil === 'MEDIUM')?.url
    || media.versoes?.find((v: any) => v.perfil === 'THUMBNAIL')?.url
    || media.originalUrl

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href={media.empreendimentoId ? `/dashboard/empreendimentos/${media.empreendimentoId}` : '/dashboard/empreendimentos'}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} /> Voltar ao empreendimento
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preview */}
        <div className="bg-white rounded-xl border overflow-hidden">
          {media.tipo === 'IMAGE' ? (
            <img src={thumbUrl} alt={form.altText || media.originalNome} className="w-full object-contain max-h-80" />
          ) : media.tipo === 'VIDEO' ? (
            <div className="w-full h-64 bg-gray-900 flex items-center justify-center text-white text-sm">
              Vídeo: {media.originalNome}
            </div>
          ) : (
            <div className="w-full h-64 bg-red-50 flex items-center justify-center text-red-400 text-sm">
              PDF: {media.originalNome}
            </div>
          )}

          <div className="p-4 space-y-2 text-xs text-gray-500">
            <p><span className="font-medium">Arquivo:</span> {media.originalNome}</p>
            <p><span className="font-medium">Tipo:</span> {media.tipo}</p>
            {media.tamanhoBytes && (
              <p><span className="font-medium">Tamanho:</span> {(media.tamanhoBytes / 1024 / 1024).toFixed(2)} MB</p>
            )}
            {media.largura && media.altura && (
              <p><span className="font-medium">Dimensões:</span> {media.largura}×{media.altura}px</p>
            )}
          </div>

          {/* Versões geradas */}
          {media.versoes?.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Versões geradas:</p>
              <div className="flex flex-wrap gap-1">
                {media.versoes.map((v: any) => (
                  <a
                    key={v.id}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    {v.perfil}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formulário */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Editar metadados</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto alternativo (SEO)</label>
              <input
                type="text"
                value={form.altText}
                onChange={e => setForm(p => ({ ...p, altText: e.target.value }))}
                placeholder="Descrição da imagem para acessibilidade"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={form.categoria}
                onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecionar categoria</option>
                {CATEGORIA_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
              <input
                type="number"
                min={0}
                value={form.ordem}
                onChange={e => setForm(p => ({ ...p, ordem: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setForm(p => ({ ...p, destaque: !p.destaque }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm w-full border transition-all ${form.destaque ? 'bg-yellow-50 border-yellow-400 text-yellow-700' : 'border-gray-300 text-gray-600 hover:border-yellow-300'}`}
            >
              {form.destaque ? <Star size={16} className="fill-yellow-400 text-yellow-400" /> : <StarOff size={16} />}
              {form.destaque ? 'Destaque ativado' : 'Marcar como destaque'}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Ações</h2>

            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
            >
              {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {regenerating ? 'Regerando versões...' : 'Regerar versões de imagem'}
            </button>

            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-2 w-full px-4 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {removing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {removing ? 'Removendo...' : 'Remover mídia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
