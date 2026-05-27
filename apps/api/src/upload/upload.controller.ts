import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UploadService } from './upload.service'

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private service: UploadService) {}

  @Post('url')
  @ApiOperation({ summary: 'Obter URL assinada para upload direto para R2' })
  getUploadUrl(@Body() body: { filename: string; contentType: string }, @Request() req: any) {
    return this.service.getUploadUrl(req.user.organizationId, body.filename, body.contentType)
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirmar upload e criar importação' })
  confirmUpload(
    @Body() body: { keys: string[]; empreendimentoId?: string },
    @Request() req: any,
  ) {
    return this.service.createImportFromUpload(req.user.organizationId, body.keys, body.empreendimentoId)
  }
}
