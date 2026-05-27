import 'dotenv/config'
import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
})

async function notifyMainSite(empreendimentoId: string) {
  const mainSiteUrl = process.env.MAIN_SITE_URL
  const apiKey = process.env.MAIN_SITE_API_KEY

  if (!mainSiteUrl || !apiKey || apiKey === 'placeholder') {
    console.log('[PUBLISHER] MAIN_SITE_API_KEY não configurado, pulando notificação')
    return
  }

  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    include: {
      medias: {
        where: { ativo: true },
        include: { versoes: true },
      },
      documentos: { where: { ativo: true } },
    },
  })

  if (!empreendimento) return

  try {
    const response = await fetch(`${mainSiteUrl}/api/empreendimentos/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        action: 'UPSERT',
        empreendimento: {
          id: empreendimento.id,
          slug: empreendimento.slug,
          nome: empreendimento.nome,
          status: empreendimento.status,
          medias: empreendimento.medias.map(m => ({
            id: m.id,
            categoria: m.categoria,
            tipo: m.tipo,
            ordem: m.ordem,
            destaque: m.destaque,
            altText: m.altText,
            urls: m.versoes.reduce((acc: any, v) => ({ ...acc, [v.perfil]: v.cdn || v.url }), {}),
          })),
        },
      }),
    })

    if (response.ok) {
      console.log(`[PUBLISHER] Site principal notificado: ${empreendimentoId}`)
    } else {
      console.error(`[PUBLISHER] Erro ao notificar site: ${response.status}`)
    }
  } catch (err: any) {
    console.error(`[PUBLISHER] Falha na notificação: ${err.message}`)
  }
}

async function purgeCloudflareCache(empreendimentoSlug: string) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  if (!zoneId || !apiToken || apiToken === 'placeholder') return

  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefixes: [
          `https://imov.somar.ia.br/empreendimentos/${empreendimentoSlug}`,
          `https://media.imov.somar.ia.br/empreendimentos/`,
        ],
      }),
    })
    console.log(`[PUBLISHER] Cache Cloudflare purgado para: ${empreendimentoSlug}`)
  } catch (err: any) {
    console.error(`[PUBLISHER] Erro ao purgar cache: ${err.message}`)
  }
}

const worker = new Worker(
  'publish',
  async (job) => {
    console.log(`[PUBLISHER] Job ${job.name}: ${job.id}`)

    const { empreendimentoId, importacaoId, notifyMainSite: shouldNotify } = job.data

    if (!empreendimentoId) return

    const emp = await prisma.empreendimento.findUnique({ where: { id: empreendimentoId } })
    if (!emp) return

    if (shouldNotify) {
      await notifyMainSite(empreendimentoId)
      await purgeCloudflareCache(emp.slug)
    }

    if (importacaoId) {
      await prisma.importacao.update({
        where: { id: importacaoId },
        data: { status: 'CONCLUIDO', progresso: 100, completedAt: new Date() },
      })
    }

    return { published: true, empreendimentoId }
  },
  { connection: redisConnection },
)

worker.on('completed', (job) => console.log(`[PUBLISHER] Job ${job.id} concluído`))
worker.on('failed', (job, err) => console.error(`[PUBLISHER] Job ${job?.id} falhou:`, err.message))

process.on('SIGTERM', async () => {
  await worker.close()
  await prisma.$disconnect()
  redisConnection.disconnect()
})

console.log('[PUBLISHER] Worker iniciado')
