import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { FinancialService } from '../financial/financial.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialService: FinancialService,
  ) {}

  async list(q: PaginationDto) {
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { organization: true, healthUnit: true },
      }),
      this.prisma.contract.count({ where }),
    ]);
    return paginate(data, total, q.page, q.limit);
  }

  async profile(id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      include: {
        organization: true,
        publicAgency: true,
        healthUnit: true,
        _count: { select: { vacancies: true } },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async financial(id: string) {
    await this.profile(id);
    return this.financialService.forContract(id);
  }

  async create(dto: CreateContractDto) {
    // Selecionar a unidade deriva a organização (comportamento observado).
    let organizationId = dto.organizationId;
    if (!organizationId) {
      const unit = await this.prisma.healthUnit.findUnique({ where: { id: dto.healthUnitId } });
      organizationId = unit?.organizationId ?? undefined;
    }
    const code = dto.code ?? (await this.nextCode());
    return this.prisma.contract.create({
      data: {
        ...dto,
        code,
        organizationId,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  private async nextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CTR-${year}-`;
    const count = await this.prisma.contract.count({ where: { code: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.profile(id);
    return this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.profile(id);
    await this.prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    return { success: true };
  }
}
