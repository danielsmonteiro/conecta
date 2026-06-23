import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MatchingService } from './matching.service';

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  // GET /api/matching/scores  (opcional ?vacancyId=&limit=)
  @Get('scores')
  scores(
    @Query('vacancyId') vacancyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (vacancyId) {
      return this.matching.scoreVacancy(vacancyId, limit ? Number(limit) : 5);
    }
    return this.matching.scores(page ? Number(page) : 1, limit ? Number(limit) : 12);
  }
}

@Module({
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
