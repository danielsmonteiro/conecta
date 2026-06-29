import {
  Body,
  Controller,
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
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingModule } from '../messaging/messaging.module';
import { MessagingService } from '../messaging/messaging.service';

class SendMessageDto {
  @IsString() @MinLength(1) body: string;
  @IsOptional() @IsBoolean() sentByAi?: boolean;
}

class UpdateConversationDto {
  @IsOptional() @IsIn(['OPEN', 'AI_ACTIVE', 'WAITING_HUMAN', 'CLOSED']) status?: any;
  @IsOptional() @IsBoolean() aiEnabled?: boolean;
  // Vincula (ou troca) a vaga desta conversa. String vazia desvincula.
  @IsOptional() @IsString() vacancyId?: string;
}

// Abordagem ativa: abre/vincula uma conversa de WhatsApp a uma vaga, liga a IA e
// (opcionalmente) envia a mensagem de convite. É o gatilho que faz o profissional
// poder se candidatar pela conversa daquela vaga específica.
class OutreachDto {
  @IsString() vacancyId: string;
  @IsString() professionalId: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsBoolean() sendOpener?: boolean;
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

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

  // Envia uma mensagem de saída via provedor de WhatsApp (Twilio/OpenWA):
  // cria Message + log, dispara o envio real e propaga o status de entrega.
  async sendMessage(id: string, dto: SendMessageDto) {
    await this.get(id);
    return this.messaging.sendFromConversation(id, dto.body, { sentByAi: dto.sentByAi });
  }

  async update(id: string, dto: UpdateConversationDto) {
    await this.get(id);
    const data: any = { ...dto };
    // String vazia → desvincula a vaga (null); id informado → valida que existe.
    if (dto.vacancyId !== undefined) {
      if (dto.vacancyId === '') {
        data.vacancyId = null;
      } else {
        const v = await this.prisma.vacancy.findFirst({ where: { id: dto.vacancyId, deletedAt: null } });
        if (!v) throw new NotFoundException('Vacancy not found');
      }
    }
    return this.prisma.conversation.update({ where: { id }, data });
  }

  // Abordagem ativa de um profissional para uma vaga. Reaproveita a conversa
  // aberta do profissional (re-vinculando à vaga) ou cria uma nova; liga a IA e,
  // por padrão, dispara a mensagem de convite. A IA responde quando o
  // profissional retornar (inbound), podendo registrar a candidatura.
  async startOutreach(dto: OutreachDto) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id: dto.vacancyId, deletedAt: null },
      include: { healthUnit: true, specialty: true },
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    const professional = await this.prisma.healthProfessional.findFirst({
      where: { id: dto.professionalId, deletedAt: null },
    });
    if (!professional) throw new NotFoundException('Professional not found');

    const subject = `Abordagem ativa - ${vacancy.title}`;
    // Reusa a conversa aberta APENAS se já for desta mesma vaga (re-contato
    // idempotente). Para uma vaga diferente, abre uma conversa NOVA dedicada — assim
    // o histórico/funil fica limpo por vaga. O roteamento do inbound continua certo:
    // ingestInbound pega a conversa aberta mais recente (esta, recém-criada).
    const sameVaga = await this.prisma.conversation.findFirst({
      where: {
        professionalId: professional.id,
        vacancyId: vacancy.id,
        status: { in: ['OPEN', 'AI_ACTIVE', 'WAITING_HUMAN'] },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    let conversation;
    if (sameVaga) {
      conversation = await this.prisma.conversation.update({
        where: { id: sameVaga.id },
        data: { channel: 'WHATSAPP', status: 'AI_ACTIVE', aiEnabled: true, subject },
      });
    } else {
      conversation = await this.prisma.conversation.create({
        data: {
          professionalId: professional.id,
          vacancyId: vacancy.id,
          channel: 'WHATSAPP',
          status: 'AI_ACTIVE',
          aiEnabled: true,
          subject,
        },
      });
    }

    const sendOpener = dto.sendOpener ?? true;
    let openerSent = false;
    if (sendOpener && professional.whatsapp) {
      const body = (dto.message?.trim() || this.defaultOpener(vacancy, professional)).slice(0, 1000);
      try {
        await this.messaging.sendFromConversation(conversation.id, body);
        openerSent = true;
      } catch {
        // Best-effort: o vínculo + IA já estão prontos; o envio é reprocessável.
      }
    }

    return this.get(conversation.id).then((c) => ({ ...c, openerSent }));
  }

  private defaultOpener(vacancy: any, professional: any): string {
    const firstName = (professional.fullName || '').trim().split(/\s+/)[0] || 'Olá';
    const tz = process.env.TZ || 'America/Fortaleza';
    const when = new Date(vacancy.startsAt).toLocaleString('pt-BR', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const unit = vacancy.healthUnit?.name ? ` na ${vacancy.healthUnit.name}` : '';
    return `Olá, ${firstName}! Temos um plantão "${vacancy.title}"${unit} em ${when}. Tem interesse? Posso registrar sua candidatura.`;
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

  // Abordagem ativa: vincula uma conversa a uma vaga e dispara o convite.
  @Post('outreach')
  @HttpCode(201)
  outreach(@Body() dto: OutreachDto) {
    return this.service.startOutreach(dto);
  }
}

@Module({
  imports: [MessagingModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
