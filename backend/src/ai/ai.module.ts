import { Body, Controller, Get, Injectable, Module, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingModule } from '../messaging/messaging.module';
import { MemoryModule } from '../memory/memory.module';
import { QueueModule } from '../queue/queue.module';
import { AiEngineService } from './ai-engine.service';
import { AiInboundWorker } from './ai-inbound.worker';
import { OpenAiProvider } from './llm/openai.provider';
import { OperatorNotifierService } from './operator-notifier.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/ai/status — CONFIGURAÇÃO da automação de IA (mesmo contrato da produção).
  status() {
    const provider = process.env.AI_PROVIDER ?? 'openai';
    const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const defaultModel = provider === 'anthropic' ? 'claude-haiku-4-5' : 'gpt-4o-mini';
    return {
      enabled: process.env.AI_ENABLED !== 'false',
      dryRun: process.env.AI_DRY_RUN === 'true',
      autoReplyEnabled: process.env.AI_AUTO_REPLY === 'true',
      model: process.env.AI_MODEL ?? defaultModel,
      reasoningEffort: process.env.AI_REASONING_EFFORT ?? 'medium',
      hasOpenAiKey,
      maxContextMessages: Number(process.env.AI_MAX_CONTEXT_MESSAGES ?? 20),
      requireHumanForCriticalActions: process.env.AI_REQUIRE_HUMAN !== 'false',
      provider,
      isConfigured: provider === 'anthropic' ? hasAnthropicKey : hasOpenAiKey,
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
  constructor(
    private readonly service: AiService,
    private readonly engine: AiEngineService,
  ) {}

  @Get('status')
  status() {
    return this.service.status();
  }

  @Get('conversation-runs')
  runs(@Query() q: PaginationDto) {
    return this.service.conversationRuns(q);
  }

  // Roda o motor de IA numa conversa sob demanda (teste/operação). dryRun opcional.
  @Post('conversations/:id/run')
  run(@Param('id') id: string, @Body() body: { dryRun?: boolean }) {
    return this.engine.run(id, { trigger: 'MANUAL', dryRun: body?.dryRun });
  }
}

@Module({
  imports: [MessagingModule, MemoryModule, QueueModule],
  controllers: [AiController],
  providers: [AiService, AiEngineService, OpenAiProvider, AiInboundWorker, OperatorNotifierService],
  exports: [AiEngineService],
})
export class AiModule {}
