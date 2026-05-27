'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { importacoesApi } from '@/lib/api'
import { Upload, Link2, FolderOpen, ArrowRight, Loader2 } from 'lucide-react'

const SOURCE_EXAMPLES = [
  'https://drive.google.com/drive/folders/...',
  'https://www.dropbox.com/sh/...',
  'https://onedrive.live.com/...',
  'https://wetransfer.com/downloads/...',
  'https://example.com/materiais.zip',
]

export default function NovaImportacaoPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return
    setLoading(true)
    setError('')

    try {
      const { data } = await importacoesApi.criar({
        sourceType: 'DIRECT_UPLOAD',
        config: { autoCreateEmpreendimento: true },
      })
      router.push(`/importacoes/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar importação')
      setLoading(false)
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [], 'application/zip': [] },
    disabled: loading,
  })

  async function handleUrlImport(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')

    try {
      const sourceType = detectSourceType(url)
      const { data } = await importacoesApi.criar({
        sourceType,
        sourceUrl: url.trim(),
        config: { autoCreateEmpreendimento: true, processVideos: true, processPdfs: true },
      })
      router.push(`/importacoes/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar importação')
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nova Importação</h1>
      <p className="text-gray-500 mb-8">Cole um link ou arraste arquivos — aceita qualquer fonte</p>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'url' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:border-blue-300'}`}
        >
          <Link2 size={16} /> Colar Link
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'upload' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:border-blue-300'}`}
        >
          <Upload size={16} /> Upload de Arquivos
        </button>
      </div>

      {mode === 'url' ? (
        <form onSubmit={handleUrlImport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link da pasta ou arquivo
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            />
            <div className="mt-2 space-y-1">
              {SOURCE_EXAMPLES.map((ex, i) => (
                <p key={i} className="text-xs text-gray-400">✓ {ex}</p>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {loading ? 'Criando importação...' : 'Iniciar Importação'}
          </button>
        </form>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
        >
          <input {...getInputProps()} />
          <FolderOpen size={48} className="mx-auto text-gray-400 mb-4" />
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin text-blue-600" />
              <span className="text-blue-600">Processando...</span>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
              </p>
              <p className="text-sm text-gray-500 mt-2">Imagens, vídeos, PDFs, ZIPs — até 500MB por arquivo</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function detectSourceType(url: string): string {
  if (url.includes('drive.google.com')) return 'GOOGLE_DRIVE'
  if (url.includes('dropbox.com')) return 'DROPBOX'
  if (url.includes('onedrive.live.com') || url.includes('sharepoint.com')) return 'ONEDRIVE'
  if (url.includes('wetransfer.com') || url.includes('we.tl/')) return 'WETRANSFER'
  if (url.match(/\.(zip|tar\.gz|rar|7z)(\?.*)?$/i)) return 'ZIP_UPLOAD'
  return 'HTTP_URL'
}
