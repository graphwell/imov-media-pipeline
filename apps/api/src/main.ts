import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  )

  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  app.setGlobalPrefix('api')

  const config = new DocumentBuilder()
    .setTitle('IMOV MEDIA PIPELINE API')
    .setDescription('API enterprise para importação e publicação de mídia imobiliária')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  // Serializar BigInt como string no JSON (campos como tamanho de arquivo)
  ;(BigInt.prototype as any).toJSON = function () { return this.toString() }

  const port = process.env.PORT || 3001
  await app.listen(port, '0.0.0.0')
  console.log(`IMOV API rodando em http://0.0.0.0:${port}`)
  console.log(`Swagger docs: http://0.0.0.0:${port}/api/docs`)
}

bootstrap()
