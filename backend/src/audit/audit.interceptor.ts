import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

// Mapeia o recurso da rota para o nome da entidade (igual à produção).
const ENTITY: Record<string, string> = {
  organizations: 'Organization',
  'public-agencies': 'PublicAgency',
  'health-units': 'HealthUnit',
  'health-professionals': 'HealthProfessional',
  contracts: 'Contract',
  vacancies: 'Vacancy',
  applications: 'Application',
  allocations: 'Allocation',
  conversations: 'Conversation',
  specialties: 'Specialty',
  'document-types': 'DocumentType',
};

const VERB: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'archive', // DELETE é arquivamento (soft) — mesma semântica da produção
};

/**
 * Registra um AuditLog para toda requisição mutadora bem-sucedida, derivando
 * `action = "<recurso>.<verbo>"`, ator (usuário autenticado) e entidade afetada.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const verb = VERB[method];

    if (!verb) return next.handle(); // GET e afins não auditam

    const path: string = (req.path || req.url || '').replace(/[?#].*$/, '');
    const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean);
    const resource = segments[0] ?? 'unknown';
    if (resource === 'auth') return next.handle(); // login/refresh/logout não são auditados
    const entityType = ENTITY[resource] ?? resource;
    const actorUserId = req.user?.id ?? null;
    const paramId = req.params?.id ?? null;

    return next.handle().pipe(
      tap((body) => {
        const entityId = paramId ?? body?.id ?? null;
        void this.audit.record({
          actorUserId,
          action: `${resource}.${verb}`,
          entityType,
          entityId,
          payload: method === 'POST' && body?.code ? { code: body.code, status: body.status } : undefined,
        });
      }),
    );
  }
}
