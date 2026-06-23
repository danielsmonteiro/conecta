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
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

class CreateApplicationDto {
  @IsString() vacancyId: string;
  @IsString() professionalId: string;
  @IsOptional() @IsNumber() matchScore?: number;
  @IsOptional() @IsString() notes?: string;
}

class UpdateApplicationStatusDto {
  @IsIn(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'])
  status: any;
}

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PaginationDto, filter: { vacancyId?: string; professionalId?: string; status?: string }) {
    const where = {
      vacancyId: filter.vacancyId,
      professionalId: filter.professionalId,
      status: filter.status as any,
    };
    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { vacancy: true, professional: true },
      }),
      this.prisma.application.count({ where }),
    ]);
    return paginate(data, total, q.page, q.limit);
  }

  async get(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { vacancy: true, professional: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async create(dto: CreateApplicationDto) {
    const app = await this.prisma.application.create({ data: dto });
    // Atualiza contador de candidaturas do profissional (métrica 1:1).
    await this.prisma.professionalMetrics.updateMany({
      where: { doctorId: dto.professionalId },
      data: { applicationsCount: { increment: 1 } },
    });
    return app;
  }

  // Transição de status. Aprovar cria automaticamente uma alocação PENDING.
  async setStatus(id: string, status: string) {
    const app = await this.get(id);
    const updated = await this.prisma.application.update({ where: { id }, data: { status: status as any } });
    if (status === 'APPROVED') {
      const exists = await this.prisma.allocation.findFirst({
        where: { vacancyId: app.vacancyId, professionalId: app.professionalId },
      });
      if (!exists) {
        await this.prisma.allocation.create({
          data: {
            vacancyId: app.vacancyId,
            professionalId: app.professionalId,
            status: 'PENDING',
            startsAt: app.vacancy.startsAt,
            endsAt: app.vacancy.endsAt,
          },
        });
        await this.prisma.professionalMetrics.updateMany({
          where: { doctorId: app.professionalId },
          data: { allocationsCount: { increment: 1 } },
        });
      }
    }
    return updated;
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.application.delete({ where: { id } });
    return { success: true };
  }
}

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Get()
  list(
    @Query() q: PaginationDto,
    @Query('vacancyId') vacancyId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(q, { vacancyId, professionalId, status });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateApplicationDto) {
    return this.service.create(dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.service.setStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
