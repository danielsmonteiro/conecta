import { Module } from '@nestjs/common';
import { FinancialModule } from '../financial/financial.module';
import { HealthProfessionalsController } from './health-professionals.controller';
import { HealthProfessionalsService } from './health-professionals.service';

@Module({
  imports: [FinancialModule],
  controllers: [HealthProfessionalsController],
  providers: [HealthProfessionalsService],
})
export class HealthProfessionalsModule {}
