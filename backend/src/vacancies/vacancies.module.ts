import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';

@Module({
  imports: [MatchingModule],
  controllers: [VacanciesController],
  providers: [VacanciesService],
})
export class VacanciesModule {}
