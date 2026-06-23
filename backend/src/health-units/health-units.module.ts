import { Controller, Get, Module, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health-units')
@UseGuards(JwtAuthGuard)
export class HealthUnitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: PaginationDto) {
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.healthUnit.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          organization: { select: { id: true, name: true } },
          publicAgency: { select: { id: true, name: true } },
        },
      }),
      this.prisma.healthUnit.count({ where }),
    ]);
    // contactsCount/rulesCount/documentRequirementsCount são computados (sem
    // entidade de apoio ainda → 0), espelhando o shape da produção.
    const items = data.map((u) => ({ ...u, contactsCount: 0, rulesCount: 0, documentRequirementsCount: 0 }));
    return paginate(items, total, q.page, q.limit);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.healthUnit.findFirst({
      where: { id, deletedAt: null },
      include: { organization: true, publicAgency: true },
    });
  }
}

@Module({ controllers: [HealthUnitsController] })
export class HealthUnitsModule {}
