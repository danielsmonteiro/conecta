import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('cbos')
@UseGuards(JwtAuthGuard)
export class CbosController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/cbos?search=&limit=&page=  — busca por nome, código ou CBO 2002.
  @Get()
  async list(@Query() q: PaginationDto, @Query('search') search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search } },
            { cbo2002: { contains: search } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.cbo.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.cbo.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }
}

@Module({ controllers: [CbosController] })
export class CbosModule {}
