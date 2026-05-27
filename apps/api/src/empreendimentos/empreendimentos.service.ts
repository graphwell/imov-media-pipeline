import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'
import slugify from 'slugify'

@Injectable()
export class EmpreendimentosService {
  constructor(private prisma: PrismaService, private queue: QueueService) {}

  async listar(organizationId: string, page = 1, limit = 20, status?: string) {
    const where: any = { organizationId }
    if (status) where.status = status

    const [data, total] = await Promise.all([
      this.prisma.empreendimento.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { medias: true, importacoes: true } },
          medias: { where: { destaque: true, ativo: true }, take: 1, include: { versoes: { where: { perfil: 'CARD' } } } },
        },
      }),
      this.prisma.empreendimento.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async buscarPorId(id: string, organizationId: string) {
    const emp = await this.prisma.empreendimento.findFirst({
      where: { id, organizationId },
      include: {
        medias: {
          where: { ativo: true },
          orderBy: [{ destaque: 'desc' }, { ordem: 'asc' }],
          include: { versoes: true },
        },
        galerias: { include: { medias: { include: { media: { include: { versoes: true } } } } } },
        documentos: { where: { ativo: true } },
        _count: { select: { importacoes: true } },
      },
    })

    if (!emp) throw new NotFoundException('Empreendimento não encontrado')
    return emp
  }

  async criar(data: any, organizationId: string) {
    const slug = slugify(data.nome, { lower: true, strict: true }) + '-' + Date.now()
    return this.prisma.empreendimento.create({
      data: { ...data, organizationId, slug },
    })
  }

  async atualizar(id: string, data: any, organizationId: string) {
    const emp = await this.prisma.empreendimento.findFirst({ where: { id, organizationId } })
    if (!emp) throw new NotFoundException('Empreendimento não encontrado')
    return this.prisma.empreendimento.update({ where: { id }, data })
  }

  async publicar(id: string, organizationId: string) {
    const emp = await this.prisma.empreendimento.findFirst({ where: { id, organizationId } })
    if (!emp) throw new NotFoundException('Empreendimento não encontrado')

    await this.prisma.empreendimento.update({
      where: { id },
      data: { status: 'PUBLICADO', publishedAt: new Date() },
    })

    await this.queue.publish.add('publish-to-site', {
      empreendimentoId: id,
      notifyMainSite: true,
    })

    return { message: 'Empreendimento publicado e notificação enviada', id }
  }

  async remover(id: string, organizationId: string) {
    const emp = await this.prisma.empreendimento.findFirst({ where: { id, organizationId } })
    if (!emp) throw new NotFoundException('Empreendimento não encontrado')
    await this.prisma.empreendimento.update({ where: { id }, data: { status: 'ARQUIVADO' } })
    return { message: 'Empreendimento arquivado' }
  }
}
