import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { FinancialService } from '../financial/financial.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHealthProfessionalDto } from './dto/create-health-professional.dto';
import { UpdateHealthProfessionalDto } from './dto/update-health-professional.dto';

@Injectable()
export class HealthProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialService: FinancialService,
  ) {}

  async list(q: PaginationDto) {
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.healthProfessional.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { mainSpecialty: true, primaryCbo: true },
      }),
      this.prisma.healthProfessional.count({ where }),
    ]);
    return paginate(data, total, q.page, q.limit);
  }

  async profile(id: string) {
    const prof = await this.prisma.healthProfessional.findFirst({
      where: { id, deletedAt: null },
      include: { mainSpecialty: true, primaryCbo: true, metrics: true },
    });
    if (!prof) throw new NotFoundException('Health professional not found');
    return prof;
  }

  async create(dto: CreateHealthProfessionalDto) {
    // Cria o profissional + registro 1:1 de métricas (comportamento observado).
    return this.prisma.healthProfessional.create({
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        additionalCboIds: dto.additionalCboIds ?? [],
        metrics: { create: {} },
      },
      include: { metrics: true },
    });
  }

  async update(id: string, dto: UpdateHealthProfessionalDto) {
    await this.profile(id);
    return this.prisma.healthProfessional.update({
      where: { id },
      data: { ...dto, birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined },
    });
  }

  async remove(id: string) {
    await this.profile(id);
    await this.prisma.healthProfessional.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    return { success: true };
  }

  /* ----------------- Sub-recursos ----------------- */

  async metrics(id: string) {
    await this.profile(id);
    return this.prisma.professionalMetrics.findUnique({ where: { doctorId: id } });
  }

  async allocations(id: string) {
    await this.profile(id);
    return this.prisma.allocation.findMany({ where: { professionalId: id }, include: { vacancy: true } });
  }

  // Timeline derivada de candidaturas e alocações do profissional.
  async events(id: string) {
    await this.profile(id);
    const [apps, allocs] = await Promise.all([
      this.prisma.application.findMany({ where: { professionalId: id }, include: { vacancy: true } }),
      this.prisma.allocation.findMany({ where: { professionalId: id }, include: { vacancy: true } }),
    ]);
    const events = [
      ...apps.map((a) => ({
        type: 'APPLICATION',
        at: a.createdAt,
        status: a.status,
        vacancyId: a.vacancyId,
        vacancyTitle: a.vacancy.title,
      })),
      ...allocs.map((a) => ({
        type: 'ALLOCATION',
        at: a.createdAt,
        status: a.status,
        vacancyId: a.vacancyId,
        vacancyTitle: a.vacancy.title,
      })),
    ];
    return events.sort((x, y) => y.at.getTime() - x.at.getTime());
  }

  async financial(id: string) {
    await this.profile(id);
    return this.financialService.forProfessional(id);
  }

  async conversations(id: string) {
    await this.profile(id);
    return this.prisma.conversation.findMany({
      where: { professionalId: id },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async channelIdentities(id: string) {
    await this.profile(id);
    const prof = await this.prisma.healthProfessional.findUnique({ where: { id } });
    const stored = await this.prisma.channelIdentity.findMany({ where: { professionalId: id } });
    // Garante ao menos a identidade de WhatsApp derivada do cadastro.
    if (!stored.some((s) => s.channel === 'WHATSAPP') && prof?.whatsapp) {
      return [
        { channel: 'WHATSAPP', identifier: prof.whatsapp, verified: false, derived: true },
        ...stored,
      ];
    }
    return stored;
  }
}
