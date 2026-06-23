import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

class CreateAllocationDto {
  @IsString() vacancyId: string;
  @IsString() professionalId: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}

class UpdateAllocationStatusDto {
  @IsIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REPLACEMENT_NEEDED'])
  status: any;
}

@Injectable()
export class AllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PaginationDto, filter: { vacancyId?: string; professionalId?: string; status?: string; startsFrom?: string }) {
    const where: any = {
      vacancyId: filter.vacancyId,
      professionalId: filter.professionalId,
      status: filter.status as any,
    };
    if (filter.startsFrom) where.startsAt = { gte: new Date(filter.startsFrom) };
    const [data, total] = await Promise.all([
      this.prisma.allocation.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { vacancy: true, professional: true },
      }),
      this.prisma.allocation.count({ where }),
    ]);
    return paginate(data, total, q.page, q.limit);
  }

  async get(id: string) {
    const a = await this.prisma.allocation.findUnique({
      where: { id },
      include: { vacancy: true, professional: true },
    });
    if (!a) throw new NotFoundException('Allocation not found');
    return a;
  }

  async create(dto: CreateAllocationDto) {
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id: dto.vacancyId } });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return this.prisma.allocation.create({
      data: {
        vacancyId: dto.vacancyId,
        professionalId: dto.professionalId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : vacancy.startsAt,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : vacancy.endsAt,
      },
    });
  }

  // Transições afetam contadores do profissional e filledDoctors da vaga.
  async setStatus(id: string, status: string) {
    const alloc = await this.get(id);
    const prev = alloc.status;
    const updated = await this.prisma.allocation.update({ where: { id }, data: { status: status as any } });

    const becameActive = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(status);
    const wasActive = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(prev);
    if (becameActive && !wasActive) {
      await this.prisma.vacancy.update({
        where: { id: alloc.vacancyId },
        data: { filledDoctors: { increment: 1 } },
      });
    } else if (!becameActive && wasActive) {
      await this.prisma.vacancy.update({
        where: { id: alloc.vacancyId },
        data: { filledDoctors: { decrement: 1 } },
      });
    }

    if (status === 'COMPLETED') {
      await this.prisma.professionalMetrics.updateMany({
        where: { doctorId: alloc.professionalId },
        data: { completedAllocationsCount: { increment: 1 } },
      });
    }
    if (status === 'CANCELLED') {
      await this.prisma.professionalMetrics.updateMany({
        where: { doctorId: alloc.professionalId },
        data: { cancellationsCount: { increment: 1 } },
      });
    }
    return updated;
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.allocation.delete({ where: { id } });
    return { success: true };
  }

  // GET /api/allocations/schedule — escala a partir das alocações ativas.
  async schedule(from?: string, to?: string) {
    const allocations = await this.prisma.allocation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        startsAt: from ? { gte: new Date(from) } : undefined,
        endsAt: to ? { lte: new Date(to) } : undefined,
      },
      orderBy: { startsAt: 'asc' },
      include: {
        professional: { select: { id: true, fullName: true } },
        vacancy: { select: { id: true, title: true, healthUnitId: true, workModel: true } },
      },
    });
    return {
      entries: allocations.map((a) => ({
        allocationId: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        professional: a.professional,
        vacancy: a.vacancy,
      })),
      total: allocations.length,
    };
  }
}

@Controller('allocations')
@UseGuards(JwtAuthGuard)
export class AllocationsController {
  constructor(private readonly service: AllocationsService) {}

  // schedule precisa vir antes de :id para não colidir.
  @Get('schedule')
  schedule(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.schedule(from, to);
  }

  @Get()
  list(
    @Query() q: PaginationDto,
    @Query('vacancyId') vacancyId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('status') status?: string,
    @Query('startsFrom') startsFrom?: string,
  ) {
    return this.service.list(q, { vacancyId, professionalId, status, startsFrom });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateAllocationDto) {
    return this.service.create(dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateAllocationStatusDto) {
    return this.service.setStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Module({
  controllers: [AllocationsController],
  providers: [AllocationsService],
})
export class AllocationsModule {}
