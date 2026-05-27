import { Global, Module } from '@nestjs/common'
import { ImportacaoGateway } from './importacao.gateway'

@Global()
@Module({
  providers: [ImportacaoGateway],
  exports: [ImportacaoGateway],
})
export class WebsocketModule {}
