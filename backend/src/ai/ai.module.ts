import { Controller, Get, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/ai/status — CONFIGURAÇÃO da automação de IA (mesmo contrato da produção).
  status() {
    const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
    return {
      enabled: process.env.AI_ENABLED !== 'false',
      dryRun: process.env.AI_DRY_RUN === 'true',
      autoReplyEnabled: process.env.AI_AUTO_REPLY === 'true',
      model: process.env.AI_MODEL ?? 'claude-haiku-4-5',
      reasoningEffort: process.env.AI_REASONING_EFFORT ?? 'medium',
      hasOpenAiKey,
      maxContextMessages: Number(process.env.AI_MAX_CONTEXT_MESSAGES ?? 20),
      requireHumanForCriticalActions: process.env.AI_REQUIRE_HUMAN !== 'false',
      provider: process.env.AI_PROVIDER ?? 'anthropic',
      isConfigured: hasOpenAiKey || !!process.env.ANTHROPIC_API_KEY,
    };
  }

  async conversationRuns(q: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.aiConversationRun.findMany({
        orderBy: { startedAt: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.aiConversationRun.count(),
    ]);
    return paginate(data, total, q.page, q.limit);
  }
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly service: AiService) {}

  @Get('status')
  status() {
    return this.service.status();
  }

  @Get('conversation-runs')
  runs(@Query() q: PaginationDto) {
    return this.service.conversationRuns(q);
  }
}

@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
