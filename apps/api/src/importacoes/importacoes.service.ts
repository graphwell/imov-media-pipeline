import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'
import { ImportacaoGateway } from '../websocket/importacao.gateway'
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator'

export class CriarImportacaoDto {
  @IsEnum(['GOOGLE_DRIVE','DROPBOX','ONEDRIVE','WETRANSFER','S3_URL','HTTP_URL','ZIP_UPLOAD','DIRECT_UPLOAD','FTP'])
  sourceType: string

  @IsOptional()
  @IsString()
  sourceUrl?: string

  @IsOptional()
  @IsString()
  empreendimentoId?: string

  @IsOptional()
  config?: {
    autoPublish?: boolean
    autoCreateEmpreendimento?: boolean
    processVideos?: boolean
    processPdfs?: boolean
    generateDescriptions?: boolean
  }
}

@Injectable()
export class ImportacoesService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
    private gateway: ImportacaoGateway,
  ) {}

  async criar(dto: CriarImportacaoDto, userId: string, organizationId: string) {
    const importacao = await this.prisma.importacao.create({
      data: {
        organizationId,
        empreendimentoId: dto.empreendimentoId,
        sourceType: dto.sourceType as any,
        sourceUrl: dto.sourceUrl,
        status: 'AGUARDANDO',
        progresso: 0,
      },
    })

    await this.queue.importacao.add('verify-source', {
      importacaoId: importacao.id,
      sourceType: dto.sourceType,
      sourceUrl: dto.sourceUrl,
      config: dto.config,
    })

    return {
      id: importacao.id,
      status: importacao.status,
      sourceType: importacao.sourceType,
      progresso: importacao.progresso,
      socketRoom: `import:${importacao.id}`,
    }
  }

  async listar(organizationId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.importacao.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { empreendimento: { select: { nome: true, slug: true } } },
      }),
      this.prisma.importacao.count({ where: { organizationId } }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async buscarPorId(id: string, organizationId: string) {
    const importacao = await this.prisma.importacao.findFirst({
      where: { id, organizationId },
      include: {
        empreendimento: { select: { id: true, nome: true, slug: true } },
        arquivos: { orderBy: { createdAt: 'asc' }, take: 100 },
      },
    })

    if (!importacao) throw new NotFoundException('Importação não encontrada')
    return importacao
  }

  async cancelar(id: string, organizationId: string) {
    const importacao = await this.prisma.importacao.findFirst({ where: { id, organizationId } })
    if (!importacao) throw new NotFoundException('Importação não encontrada')

    await this.prisma.importacao.update({
      where: { id },
      data: { status: 'CANCELADO' },
    })

    this.gateway.emitToAll('importacao-cancelada', { importacaoId: id })
    return { message: 'Importação cancelada' }
  }

  async retry(id: string, organizationId: string) {
    const importacao = await this.prisma.importacao.findFirst({
      where: { id, organizationId, status: 'ERRO' },
    })
    if (!importacao) throw new NotFoundException('Importação não encontrada ou não está em erro')

    await this.prisma.importacao.update({
      where: { id },
      data: { status: 'AGUARDANDO', progresso: 0, erros: 0 },
    })

    await this.queue.importacao.add('verify-source', {
      importacaoId: id,
      sourceType: importacao.sourceType,
      sourceUrl: importacao.sourceUrl,
    })

    return { message: 'Importação reagendada' }
  }

  async atualizarProgresso(id: string, data: {
    status?: string
    progresso?: number
    etapaAtual?: string
    totalArquivos?: number
    processados?: number
    erros?: number
  }) {
    const updated = await this.prisma.importacao.update({
      where: { id },
      data: data as any,
    })

    this.gateway.emitProgress(id, {
      importacaoId: id,
      ...data,
    })

    return updated
  }
}
