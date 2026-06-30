import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { publishDomainEvent } from '../connector/domain-events';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    // Publica eventos de domínio (best-effort) para o conector de parceiros,
    // capturando QUALQUER fluxo que crie/atualize candidaturas ou publique vagas.
    this.$use(async (params, next) => {
      const result = await next(params);
      try {
        if (params.model === 'Application' && params.action === 'create') {
          publishDomainEvent('application.created', result);
        } else if (
          params.model === 'Application' &&
          (params.action === 'update' || params.action === 'updateMany') &&
          params.args?.data?.status !== undefined
        ) {
          publishDomainEvent('application.status_changed', result);
        } else if (
          params.model === 'Vacancy' &&
          params.action === 'update' &&
          params.args?.data?.status !== undefined
        ) {
          publishDomainEvent('vacancy.status_changed', result);
        }
      } catch {
        /* nunca quebrar a operação de origem por causa de evento */
      }
      return result;
    });
  }
}
