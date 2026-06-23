import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialService } from './financial.service';

@Controller('financial')
@UseGuards(JwtAuthGuard)
export class FinancialController {
  constructor(private readonly financial: FinancialService) {}

  // GET /api/financial/entries
  @Get('entries')
  entries(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('organizationId') organizationId?: string,
    @Query('contractId') contractId?: string,
    @Query('vacancyId') vacancyId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.financial.entries({
      type,
      status,
      direction,
      overdueOnly: overdueOnly === 'true',
      organizationId,
      contractId,
      vacancyId,
      doctorId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  // GET /api/financial/summary
  @Get('summary')
  summary() {
    return this.financial.summary();
  }
}

@Module({
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
