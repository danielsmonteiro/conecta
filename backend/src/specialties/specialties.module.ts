import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('specialties')
@UseGuards(JwtAuthGuard)
export class SpecialtiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: PaginationDto, @Query('includeInactive') includeInactive?: string) {
    const where = includeInactive === 'true' ? { deletedAt: null } : { deletedAt: null, active: true };
    const [data, total] = await Promise.all([
      this.prisma.specialty.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.specialty.count({ where }),
    ]);
    return paginate(data, total, q.page, q.limit);
  }
}

@Module({ controllers: [SpecialtiesController] })
export class SpecialtiesModule {}
