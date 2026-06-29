import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AI_INBOUND_QUEUE, AI_INBOUND_QUEUE_TOKEN, redisConnection } from './queue.constants';

// Fila durável dos inbounds de IA (BullMQ sobre Redis). Producer aqui; o worker
// (consumer) vive no AiModule, que tem o motor de IA.
@Module({
  providers: [
    {
      provide: AI_INBOUND_QUEUE_TOKEN,
      useFactory: () =>
        new Queue(AI_INBOUND_QUEUE, {
          connection: redisConnection(),
          defaultJobOptions: {
            attempts: Number(process.env.AI_JOB_ATTEMPTS ?? 3),
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: true, // libera o jobId p/ a próxima rajada
            removeOnFail: true, // idem após esgotar retries (falha fica no AiConversationRun)
          },
        }),
    },
  ],
  exports: [AI_INBOUND_QUEUE_TOKEN],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(@Inject(AI_INBOUND_QUEUE_TOKEN) private readonly queue: Queue) {}
  async onApplicationShutdown() {
    await this.queue.close();
  }
}
