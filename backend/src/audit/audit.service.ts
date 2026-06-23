import { Injectable } from '@nestjs/common';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: entry.actorUserId ?? null,
          action: entry.action,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          payload: (entry.payload as any) ?? undefined,
        },
      });
    } catch {
      // auditoria nunca deve quebrar a requisição principal
    }
  }

  async list(q: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { actorUser: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return paginate(items, total, q.page, q.limit);
  }
}
