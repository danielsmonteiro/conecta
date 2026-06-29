import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { AI_INBOUND_QUEUE, redisConnection } from '../queue/queue.constants';
import { AiEngineService } from './ai-engine.service';

// Consumer da fila durável: processa cada inbound chamando o motor de IA.
// Em erro, deixa a exceção propagar → BullMQ aplica retry com backoff (attempts).
// Sobrevive a restart: jobs ficam no Redis (AOF) e jobs travados são reprocessados.
@Injectable()
export class AiInboundWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(AiInboundWorker.name);
  private worker?: Worker;

  constructor(private readonly engine: AiEngineService) {}

  onModuleInit() {
    if (process.env.AI_WORKER_ENABLED === 'false') return;
    this.worker = new Worker(
      AI_INBOUND_QUEUE,
      async (job) => {
        const { conversationId } = job.data as { conversationId: string };
        await this.engine.processInbound(conversationId);
      },
      { connection: redisConnection(), concurrency: Number(process.env.AI_WORKER_CONCURRENCY ?? 5) },
    );
    this.worker.on('failed', async (job, err) => {
      const attempts = job?.opts?.attempts ?? 1;
      this.logger.error(`job ${job?.id} falhou (tentativa ${job?.attemptsMade}/${attempts}): ${err?.message}`);
      // Só na falha FINAL (retries esgotados) aciona o fallback (uma única vez).
      if (job && (job.attemptsMade ?? 0) >= attempts) {
        await this.engine
          .handleInboundFailure(job.data.conversationId)
          .catch((e) => this.logger.error(`fallback (${job.data?.conversationId}): ${e?.message}`));
      }
    });
    this.worker.on('error', (err) => this.logger.error(`worker error: ${err?.message}`));
    this.logger.log('AiInboundWorker iniciado (fila ai-inbound).');
  }

  async onApplicationShutdown() {
    await this.worker?.close();
  }
}
