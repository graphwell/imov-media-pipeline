import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'

@Injectable()
export class MediasService {
  constructor(private prisma: PrismaService, private queue: QueueService) {}

  async listarPorEmpreendimento(empreendimentoId: string, organizationId: string, categoria?: string) {
    const emp = await this.prisma.empreendimento.findFirst({ where: { id: empreendimentoId, organizationId } })
    if (!emp) throw new NotFoundException('Empreendimento não encontrado')

    const where: any = { empreendimentoId, ativo: true }
    if (categoria) where.categoria = categoria

    return this.prisma.media.findMany({
      where,
      orderBy: [{ destaque: 'desc' }, { categoria: 'asc' }, { ordem: 'asc' }],
      include: { versoes: true },
    })
  }

  async atualizar(id: string, data: any) {
    const media = await this.prisma.media.findUnique({ where: { id } })
    if (!media) throw new NotFoundException('Mídia não encontrada')
    return this.prisma.media.update({ where: { id }, data })
  }

  async remover(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } })
    if (!media) throw new NotFoundException('Mídia não encontrada')
    return this.prisma.media.update({ where: { id }, data: { ativo: false } })
  }

  async reordenar(empreendimentoId: string, ordens: Array<{ id: string; ordem: number }>) {
    await Promise.all(
      ordens.map(({ id, ordem }) => this.prisma.media.update({ where: { id }, data: { ordem } }))
    )
    return { message: 'Ordem atualizada' }
  }

  async regenerar(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } })
    if (!media) throw new NotFoundException('Mídia não encontrada')

    await this.queue.mediaProcessing.add('regenerate-versions', { mediaId: id })
    return { message: 'Regeneração enfileirada', jobId: id }
  }
}
