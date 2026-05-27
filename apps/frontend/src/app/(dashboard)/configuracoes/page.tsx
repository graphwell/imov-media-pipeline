'use client'

export default function ConfiguracoesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h1>
      <p className="text-gray-500">Configure as integrações e preferências do sistema.</p>

      <div className="mt-6 grid gap-4">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Status dos Serviços</h2>
          <div className="space-y-3">
            <ServiceStatus label="API" url="/api/health" />
            <ServiceStatus label="Banco de Dados" url="/api/health/db" />
            <ServiceStatus label="Filas" url="/api/health/queues" />
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Bull Board — Monitoramento de Filas</h2>
          <p className="text-sm text-gray-500 mb-3">Visualize e gerencie os jobs em tempo real</p>
          <a
            href="http://localhost:3030"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700"
          >
            Abrir Bull Board →
          </a>
        </div>
      </div>
    </div>
  )
}

function ServiceStatus({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
        Verificar
      </a>
    </div>
  )
}
