import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchingService } from '../matching/matching.service';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';

@Injectable()
export class VacanciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingService: MatchingService,
  ) {}

  async list(q: PaginationDto) {
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.vacancy.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { organization: true, healthUnit: true, specialty: true },
      }),
      this.prisma.vacancy.count({ where }),
    ]);
    // requirementsCount/documentRequirementsCount computados (sem entidade de
    // apoio ainda → 0), espelhando o shape da produção.
    const items = data.map((v) => ({ ...v, requirementsCount: 0, documentRequirementsCount: 0 }));
    return paginate(items, total, q.page, q.limit);
  }

  async profile(id: string) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id, deletedAt: null },
      include: {
        contract: true,
        organization: true,
        publicAgency: true,
        healthUnit: true,
        specialty: true,
      },
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return vacancy;
  }

  async create(dto: CreateVacancyDto) {
    let organizationId = dto.organizationId;
    if (!organizationId) {
      const unit = await this.prisma.healthUnit.findUnique({ where: { id: dto.healthUnitId } });
      organizationId = unit?.organizationId ?? undefined;
    }
    // Código sequencial auto-gerado (ex.: VAG-2026-0008), como na produção.
    const code = dto.code ?? (await this.nextCode());
    return this.prisma.vacancy.create({
      data: {
        ...dto,
        code,
        organizationId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VAG-${year}-`;
    const count = await this.prisma.vacancy.count({ where: { code: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  async update(id: string, dto: UpdateVacancyDto) {
    await this.profile(id);
    return this.prisma.vacancy.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.profile(id);
    await this.prisma.vacancy.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    return { success: true };
  }

  /* ----------------- Sub-recursos (GET /:id/<aspecto>) ----------------- */

  async applications(id: string) {
    await this.profile(id);
    return this.prisma.application.findMany({
      where: { vacancyId: id },
      include: { professional: true },
    });
  }

  async allocations(id: string) {
    await this.profile(id);
    return this.prisma.allocation.findMany({
      where: { vacancyId: id },
      include: { professional: true },
    });
  }

  // Board kanban: candidaturas agrupadas por status.
  async kanban(id: string) {
    await this.profile(id);
    const apps = await this.prisma.application.findMany({
      where: { vacancyId: id },
      include: { professional: true },
    });
    const columnOrder: string[] = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'];
    const columns = columnOrder.map((status) => ({
      status,
      cards: apps
        .filter((a) => a.status === status)
        .map((a) => ({
          applicationId: a.id,
          professionalId: a.professionalId,
          professionalName: a.professional.fullName,
          matchScore: a.matchScore,
        })),
    }));
    return { vacancyId: id, columns, total: apps.length };
  }

  matching(id: string, limit = 5) {
    return this.matchingService.scoreVacancy(id, limit);
  }

  async conversations(id: string) {
    await this.profile(id);
    return this.prisma.conversation.findMany({
      where: { vacancyId: id },
      orderBy: { lastMessageAt: 'desc' },
      include: { professional: true },
    });
  }

  // Financeiro da vaga: receita (cliente) − custo (profissional) = margem.
  async financial(id: string) {
    const vacancy = await this.profile(id);
    const client = Number(vacancy.clientAmount ?? 0);
    const doctor = Number(vacancy.doctorAmount ?? 0);
    const perDoctor = { client, doctor, margin: client - doctor };
    const total = {
      client: client * vacancy.requiredDoctors,
      doctor: doctor * vacancy.requiredDoctors,
      margin: (client - doctor) * vacancy.requiredDoctors,
    };
    return { vacancyId: id, currency: vacancy.currency, perDoctor, total };
  }
}
