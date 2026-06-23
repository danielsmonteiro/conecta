import { Controller, Get, Module, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public-agencies')
@UseGuards(JwtAuthGuard)
export class PublicAgenciesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: PaginationDto) {
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.publicAgency.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { healthUnits: true, contracts: true } },
        },
      }),
      this.prisma.publicAgency.count({ where }),
    ]);
    const items = data.map(({ _count, organization, ...a }) => ({
      ...a,
      organizationName: organization?.name ?? null,
      organization,
      healthUnitsCount: _count.healthUnits,
      contractsCount: _count.contracts,
    }));
    return paginate(items, total, q.page, q.limit);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.publicAgency.findFirst({ where: { id, deletedAt: null }, include: { organization: true } });
  }
}

@Module({ controllers: [PublicAgenciesController] })
export class PublicAgenciesModule {}
