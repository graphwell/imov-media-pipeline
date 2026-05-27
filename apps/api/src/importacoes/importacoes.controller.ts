import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, HttpCode } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ImportacoesService, CriarImportacaoDto } from './importacoes.service'

@ApiTags('importacoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('importacoes')
export class ImportacoesController {
  constructor(private service: ImportacoesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova importação (qualquer fonte)' })
  criar(@Body() dto: CriarImportacaoDto, @Request() req: any) {
    return this.service.criar(dto, req.user.id, req.user.organizationId)
  }

  @Get()
  @ApiOperation({ summary: 'Listar importações' })
  listar(@Query('page') page = '1', @Query('limit') limit = '20', @Request() req: any) {
    return this.service.listar(req.user.organizationId, Number(page), Number(limit))
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes da importação com progresso' })
  buscar(@Param('id') id: string, @Request() req: any) {
    return this.service.buscarPorId(id, req.user.organizationId)
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancelar importação' })
  cancelar(@Param('id') id: string, @Request() req: any) {
    return this.service.cancelar(id, req.user.organizationId)
  }

  @Post(':id/retry')
  @HttpCode(200)
  retry(@Param('id') id: string, @Request() req: any) {
    return this.service.retry(id, req.user.organizationId)
  }
}
