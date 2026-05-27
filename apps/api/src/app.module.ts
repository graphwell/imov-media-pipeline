import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { ImportacoesModule } from './importacoes/importacoes.module'
import { EmpreendimentosModule } from './empreendimentos/empreendimentos.module'
import { MediasModule } from './medias/medias.module'
import { QueueModule } from './queue/queue.module'
import { StorageModule } from './storage/storage.module'
import { WebsocketModule } from './websocket/websocket.module'
import { HealthModule } from './health/health.module'
import { UploadModule } from './upload/upload.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    QueueModule,
    StorageModule,
    WebsocketModule,
    ImportacoesModule,
    EmpreendimentosModule,
    MediasModule,
    HealthModule,
    UploadModule,
  ],
})
export class AppModule {}
