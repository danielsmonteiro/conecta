import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

const SORTABLE = new Set(['updatedAt', 'createdAt', 'dueDate', 'competenceDate', 'amount']);

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lançamentos financeiros (recebíveis/pagáveis) com filtros e relações. */
  async entries(filter: {
    type?: string;
    status?: string;
    direction?: string;
    overdueOnly?: boolean;
    organizationId?: string;
    contractId?: string;
    vacancyId?: string;
    doctorId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 15;
    const sortBy = SORTABLE.has(filter.sortBy ?? '') ? filter.sortBy! : 'updatedAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const where: Prisma.FinancialEntryWhereInput = {
      type: filter.type as any,
      direction: filter.direction as any,
      status: filter.overdueOnly ? 'OVERDUE' : (filter.status as any),
      organizationId: filter.organizationId,
      contractId: filter.contractId,
      vacancyId: filter.vacancyId,
      doctorId: filter.doctorId,
    };

    const [items, total] = await Promise.all([
      this.prisma.financialEntry.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organization: { select: { id: true, name: true } },
          publicAgency: { select: { id: true, name: true } },
          doctor: { select: { id: true, fullName: true } },
          healthUnit: { select: { id: true, name: true } },
          contract: { select: { id: true, name: true } },
          vacancy: { select: { id: true, title: true } },
          allocation: { select: { id: true } },
        },
      }),
      this.prisma.financialEntry.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  /** Resumo financeiro: recebível/pagável por status + margem estimada. */
  async summary() {
    const grouped = await this.prisma.financialEntry.groupBy({
      by: ['direction', 'status'],
      _sum: { amount: true },
    });
    const sum = (direction: string, statuses?: string[]) =>
      grouped
        .filter((g) => g.direction === direction && (!statuses || statuses.includes(g.status)))
        .reduce((acc, g) => acc + Number(g._sum.amount ?? 0), 0);
    const sumStatus = (status: string) =>
      grouped.filter((g) => g.status === status).reduce((acc, g) => acc + Number(g._sum.amount ?? 0), 0);

    const notCancelled = ['PENDING_APPROVAL', 'APPROVED', 'PAID', 'OVERDUE', 'CONTESTED'];
    const totalReceivable = sum('IN', notCancelled);
    const totalPayable = sum('OUT', notCancelled);
    const entriesCount = await this.prisma.financialEntry.count();
    const fmt = (n: number) => n.toFixed(2);

    return {
      totalReceivable: fmt(totalReceivable),
      totalPayable: fmt(totalPayable),
      predictedReceivable: fmt(sum('IN', ['PENDING_APPROVAL'])),
      predictedPayable: fmt(sum('OUT', ['PENDING_APPROVAL'])),
      approvedReceivable: fmt(sum('IN', ['APPROVED'])),
      approvedPayable: fmt(sum('OUT', ['APPROVED'])),
      paidReceivable: fmt(sum('IN', ['PAID'])),
      paidPayable: fmt(sum('OUT', ['PAID'])),
      overdueReceivable: fmt(sum('IN', ['OVERDUE'])),
      overduePayable: fmt(sum('OUT', ['OVERDUE'])),
      cancelledAmount: fmt(sumStatus('CANCELLED')),
      contestedAmount: fmt(sumStatus('CONTESTED')),
      estimatedMargin: fmt(totalReceivable - totalPayable),
      entriesCount,
    };
  }

  /** Margem mensal estimada a partir das vagas em aberto/ativas (usado no dashboard). */
  async estimatedMonthlyMargin(): Promise<number> {
    const vacancies = await this.prisma.vacancy.findMany({
      where: {
        deletedAt: null,
        status: { in: ['OPEN', 'MATCHING', 'RECEIVING_APPLICATIONS', 'PARTIALLY_FILLED', 'IN_PROGRESS'] },
      },
      select: { clientAmount: true, doctorAmount: true, requiredDoctors: true },
    });
    return vacancies.reduce(
      (acc, v) => acc + (Number(v.clientAmount ?? 0) - Number(v.doctorAmount ?? 0)) * v.requiredDoctors,
      0,
    );
  }

  async forVacancy(vacancyId: string) {
    const v = await this.prisma.vacancy.findUnique({ where: { id: vacancyId } });
    if (!v) return { vacancyId, currency: 'BRL', client: 0, doctor: 0, margin: 0 };
    const client = Number(v.clientAmount ?? 0) * v.requiredDoctors;
    const doctor = Number(v.doctorAmount ?? 0) * v.requiredDoctors;
    return { vacancyId, currency: v.currency, client, doctor, margin: client - doctor };
  }

  async forContract(contractId: string) {
    const vacancies = await this.prisma.vacancy.findMany({
      where: { contractId, deletedAt: null },
      select: { clientAmount: true, doctorAmount: true, requiredDoctors: true },
    });
    const client = vacancies.reduce((a, v) => a + Number(v.clientAmount ?? 0) * v.requiredDoctors, 0);
    const doctor = vacancies.reduce((a, v) => a + Number(v.doctorAmount ?? 0) * v.requiredDoctors, 0);
    return { contractId, currency: 'BRL', vacancyCount: vacancies.length, client, doctor, margin: client - doctor };
  }

  async forOrganization(organizationId: string) {
    const vacancies = await this.prisma.vacancy.findMany({
      where: { organizationId, deletedAt: null },
      select: { clientAmount: true, doctorAmount: true, requiredDoctors: true },
    });
    const client = vacancies.reduce((a, v) => a + Number(v.clientAmount ?? 0) * v.requiredDoctors, 0);
    const doctor = vacancies.reduce((a, v) => a + Number(v.doctorAmount ?? 0) * v.requiredDoctors, 0);
    return { organizationId, currency: 'BRL', vacancyCount: vacancies.length, client, doctor, margin: client - doctor };
  }

  /** Ganhos do profissional = soma do doctorAmount das vagas alocadas. */
  async forProfessional(professionalId: string) {
    const allocations = await this.prisma.allocation.findMany({
      where: { professionalId, status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] } },
      include: { vacancy: { select: { doctorAmount: true, currency: true } } },
    });
    const totalEarnings = allocations.reduce((a, al) => a + Number(al.vacancy.doctorAmount ?? 0), 0);
    return { professionalId, currency: 'BRL', allocationsConsidered: allocations.length, totalEarnings };
  }
}
