import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

const redisConnection = () => new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private connection: Redis
  importacao: Queue
  classification: Queue
  mediaProcessing: Queue
  upload: Queue
  publish: Queue

  onModuleInit() {
    this.connection = redisConnection()

    this.importacao = new Queue('importacao', {
      connection: redisConnection(),
      defaultJobOptions,
    })

    this.classification = new Queue('classification', {
      connection: redisConnection(),
      defaultJobOptions: { ...defaultJobOptions, backoff: { type: 'exponential', delay: 2000 } },
    })

    this.mediaProcessing = new Queue('media-processing', {
      connection: redisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    })

    this.upload = new Queue('upload', { connection: redisConnection(), defaultJobOptions })
    this.publish = new Queue('publish', { connection: redisConnection(), defaultJobOptions })
  }

  async onModuleDestroy() {
    await Promise.all([
      this.importacao?.close(),
      this.classification?.close(),
      this.mediaProcessing?.close(),
      this.upload?.close(),
      this.publish?.close(),
    ])
    await this.connection?.quit()
  }

  async getStats() {
    const [importacaoStats, classificationStats, mediaStats, uploadStats, publishStats] = await Promise.all([
      this.getQueueStats(this.importacao),
      this.getQueueStats(this.classification),
      this.getQueueStats(this.mediaProcessing),
      this.getQueueStats(this.upload),
      this.getQueueStats(this.publish),
    ])

    return { importacao: importacaoStats, classification: classificationStats, media: mediaStats, upload: uploadStats, publish: publishStats }
  }

  private async getQueueStats(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])
    return { waiting, active, completed, failed, delayed }
  }
}
