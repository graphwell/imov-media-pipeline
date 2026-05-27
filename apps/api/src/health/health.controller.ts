import { Controller, Get } from '@nestjs/common'
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus'
import { ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../prisma/prisma.service'
import { QueueService } from '../queue/queue.service'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ])
  }

  @Get('queues')
  async queues() {
    return this.queue.getStats()
  }
}
