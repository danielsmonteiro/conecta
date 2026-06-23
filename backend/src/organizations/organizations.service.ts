import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { FinancialService } from '../financial/financial.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialService: FinancialService,
  ) {}

  async list(q: PaginationDto) {
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { _count: { select: { publicAgencies: true, healthUnits: true } } },
      }),
      this.prisma.organization.count({ where }),
    ]);
    const items = data.map(({ _count, ...o }) => ({
      ...o,
      publicAgenciesCount: _count.publicAgencies,
      healthUnitsCount: _count.healthUnits,
    }));
    return paginate(items, total, q.page, q.limit);
  }

  // GET /:id/profile — detalhe com relações e contagens (como na produção).
  async profile(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        publicAgencies: true,
        healthUnits: true,
        _count: {
          select: { publicAgencies: true, healthUnits: true, contracts: true, vacancies: true },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async financial(id: string) {
    await this.profile(id); // garante existência (404 se não houver)
    return this.financialService.forOrganization(id);
  }

  create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({ data: dto });
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.profile(id);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  // Arquivamento (soft delete) — espelha o comportamento da produção.
  async remove(id: string) {
    await this.profile(id);
    await this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    return { success: true };
  }
}
