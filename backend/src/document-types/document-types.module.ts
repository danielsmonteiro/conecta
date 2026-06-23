import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('document-types')
@UseGuards(JwtAuthGuard)
export class DocumentTypesController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/document-types  (?scope= ?includeInactive=true)
  @Get()
  async list(
    @Query() q: PaginationDto,
    @Query('scope') scope?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const where: any = { deletedAt: null };
    if (scope) where.scope = scope;
    if (includeInactive !== 'true') where.active = true;
    const [items, total] = await Promise.all([
      this.prisma.documentType.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.documentType.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }
}

@Module({ controllers: [DocumentTypesController] })
export class DocumentTypesModule {}
