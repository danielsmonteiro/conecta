import { Module } from '@nestjs/common';
import { FinancialModule } from '../financial/financial.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [FinancialModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
