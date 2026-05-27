import { Controller, Get, Put, Delete, Post, Body, Param, Query, UseGuards, Request, HttpCode } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { MediasService } from './medias.service'

@ApiTags('medias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medias')
export class MediasController {
  constructor(private service: MediasService) {}

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: any) {
    return this.service.atualizar(id, body)
  }

  @Delete(':id')
  @HttpCode(200)
  remover(@Param('id') id: string) {
    return this.service.remover(id)
  }

  @Post(':id/regenerate')
  @HttpCode(200)
  regenerar(@Param('id') id: string) {
    return this.service.regenerar(id)
  }

  @Post('reorder')
  @HttpCode(200)
  reordenar(@Body() body: { empreendimentoId: string; ordens: Array<{ id: string; ordem: number }> }, @Request() req: any) {
    return this.service.reordenar(body.empreendimentoId, body.ordens)
  }
}
