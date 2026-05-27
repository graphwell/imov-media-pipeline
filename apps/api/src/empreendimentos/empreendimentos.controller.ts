import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { EmpreendimentosService } from './empreendimentos.service'

@ApiTags('empreendimentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('empreendimentos')
export class EmpreendimentosController {
  constructor(private service: EmpreendimentosService) {}

  @Get()
  listar(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Request() req?: any,
  ) {
    return this.service.listar(req.user.organizationId, Number(page), Number(limit), status)
  }

  @Post()
  criar(@Body() body: any, @Request() req: any) {
    return this.service.criar(body, req.user.organizationId)
  }

  @Get(':id')
  buscar(@Param('id') id: string, @Request() req: any) {
    return this.service.buscarPorId(id, req.user.organizationId)
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.atualizar(id, body, req.user.organizationId)
  }

  @Delete(':id')
  @HttpCode(200)
  remover(@Param('id') id: string, @Request() req: any) {
    return this.service.remover(id, req.user.organizationId)
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publicar empreendimento no site principal' })
  publicar(@Param('id') id: string, @Request() req: any) {
    return this.service.publicar(id, req.user.organizationId)
  }
}
