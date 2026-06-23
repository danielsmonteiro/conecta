import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

class SendMessageDto {
  @IsString() @MinLength(1) body: string;
  @IsOptional() @IsBoolean() sentByAi?: boolean;
}

class UpdateConversationDto {
  @IsOptional() @IsIn(['OPEN', 'AI_ACTIVE', 'WAITING_HUMAN', 'CLOSED']) status?: any;
  @IsOptional() @IsBoolean() aiEnabled?: boolean;
}

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PaginationDto, status?: string) {
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { professional: true, vacancy: true, _count: { select: { messages: true } } },
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return paginate(data, total, q.page, q.limit);
  }

  async get(id: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        professional: true,
        vacancy: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async messages(id: string) {
    await this.get(id);
    return this.prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' } });
  }

  // Envia uma mensagem de saída: cria Message + log de saída + atualiza a conversa.
  async sendMessage(id: string, dto: SendMessageDto) {
    const conv = await this.get(id);
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId: id, direction: 'OUTBOUND', body: dto.body, status: 'QUEUED', sentByAi: !!dto.sentByAi },
      }),
      this.prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } }),
      this.prisma.outboundMessageLog.create({
        data: {
          conversationId: id,
          to: conv.professional?.whatsapp ?? 'unknown',
          body: dto.body,
          status: 'QUEUED',
        },
      }),
    ]);
    return message;
  }

  async update(id: string, dto: UpdateConversationDto) {
    await this.get(id);
    return this.prisma.conversation.update({ where: { id }, data: dto });
  }
}

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  list(@Query() q: PaginationDto, @Query('status') status?: string) {
    return this.service.list(q, status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get(':id/messages')
  messages(@Param('id') id: string) {
    return this.service.messages(id);
  }

  @Post(':id/messages')
  send(@Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.service.sendMessage(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConversationDto) {
    return this.service.update(id, dto);
  }
}

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
