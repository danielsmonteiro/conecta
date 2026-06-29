import { randomBytes } from 'crypto';
import {
  BadRequestException,
  Controller,
  Get,
  GoneException,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingModule } from '../messaging/messaging.module';
import { MessagingService } from '../messaging/messaging.service';

const UNIT_TYPE_LABEL: Record<string, string> = {
  CLINIC: 'Clínica',
  HOSPITAL: 'Hospital',
  UPA: 'UPA',
  BASIC_HEALTH_UNIT: 'Unidade Básica de Saúde',
  DIAGNOSTIC_CENTER: 'Centro de Diagnóstico',
  OTHER: 'Unidade de saúde',
};
const WORK_MODEL_LABEL: Record<string, string> = { ONSITE: 'Presencial', REMOTE: 'Remoto', HYBRID: 'Híbrido' };

@Injectable()
export class HotsiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  private ttlHours(): number {
    const n = Number(process.env.HOTSITE_LINK_TTL_HOURS);
    return Number.isFinite(n) && n > 0 ? n : 72;
  }

  private baseUrl(): string {
    return (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  }

  /** Cria um magic-link opaco (sem dados sensíveis na URL) para (profissional, vaga). */
  async createLink(input: { professionalId: string; vacancyId: string; conversationId?: string; channel?: string }) {
    const vaga = await this.prisma.vacancy.findFirst({ where: { id: input.vacancyId, deletedAt: null } });
    if (!vaga) throw new NotFoundException('Vacancy not found');
    const prof = await this.prisma.healthProfessional.findFirst({ where: { id: input.professionalId, deletedAt: null } });
    if (!prof) throw new NotFoundException('Professional not found');

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + this.ttlHours() * 3_600_000);
    await this.prisma.candidacyLink.create({
      data: {
        token,
        professionalId: input.professionalId,
        vacancyId: input.vacancyId,
        conversationId: input.conversationId,
        channel: input.channel || 'WHATSAPP',
        expiresAt,
      },
    });
    return { token, url: `${this.baseUrl()}/v/${token}`, expiresAt };
  }

  private async load(token: string) {
    const link = await this.prisma.candidacyLink.findUnique({ where: { token } });
    if (!link) throw new NotFoundException('Link inválido.');
    return link;
  }

  private isExpired(link: any): boolean {
    return link.status === 'ACTIVE' && link.expiresAt.getTime() < Date.now();
  }

  /** Detalhes da vaga p/ a landing + registro de acesso (rastreabilidade). */
  async view(token: string, meta: { ip?: string; userAgent?: string }) {
    const link = await this.load(token);
    await this.prisma.candidacyLink.update({
      where: { id: link.id },
      data: {
        firstAccessedAt: link.firstAccessedAt ?? new Date(),
        lastAccessedAt: new Date(),
        accessCount: { increment: 1 },
        lastUserAgent: meta.userAgent?.slice(0, 300),
        lastIp: meta.ip?.slice(0, 64),
      },
    });

    const status = link.status === 'CONFIRMED' ? 'confirmed' : this.isExpired(link) ? 'expired' : 'active';
    const vaga = await this.prisma.vacancy.findUnique({
      where: { id: link.vacancyId },
      include: { healthUnit: true, specialty: true, organization: true },
    });
    const prof = await this.prisma.healthProfessional.findUnique({ where: { id: link.professionalId } });
    const pending = this.pendingFields(prof);

    return {
      status,
      expiresAt: link.expiresAt,
      confirmedAt: link.confirmedAt,
      pendingFields: pending,
      professional: { firstName: (prof?.fullName || '').trim().split(/\s+/)[0] || 'Profissional' },
      vaga: vaga ? this.vagaView(vaga) : null,
    };
  }

  /** Confirmação one-click: cria a candidatura (origin HOTSITE) e avisa por WhatsApp. */
  async confirm(token: string, meta: { ip?: string; userAgent?: string }) {
    const link = await this.load(token);
    if (this.isExpired(link)) {
      throw new GoneException('Este link expirou. Peça um novo link pelo WhatsApp.');
    }
    const prof = await this.prisma.healthProfessional.findUnique({ where: { id: link.professionalId } });
    if (!prof) throw new NotFoundException('Profissional não encontrado.');
    const pending = this.pendingFields(prof);
    if (pending.length) {
      throw new BadRequestException(`Dados obrigatórios pendentes: ${pending.join(', ')}.`);
    }
    const vaga = await this.prisma.vacancy.findFirst({ where: { id: link.vacancyId, deletedAt: null }, include: { healthUnit: true, specialty: true } });
    if (!vaga) throw new NotFoundException('Vaga não encontrada.');

    // Idempotente: reaproveita candidatura existente p/ (profissional, vaga).
    let application = await this.prisma.application.findFirst({
      where: { vacancyId: link.vacancyId, professionalId: link.professionalId },
    });
    if (!application) {
      application = await this.prisma.application.create({
        data: { vacancyId: link.vacancyId, professionalId: link.professionalId, origin: 'HOTSITE', status: 'PENDING' },
      });
    }

    const alreadyConfirmed = link.status === 'CONFIRMED';
    await this.prisma.candidacyLink.update({
      where: { id: link.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: link.confirmedAt ?? new Date(),
        applicationId: application.id,
        lastAccessedAt: new Date(),
        lastUserAgent: meta.userAgent?.slice(0, 300),
        lastIp: meta.ip?.slice(0, 64),
      },
    });

    // Vincula a conversa à vaga + marca interesse (contratante vê o candidato/histórico).
    if (link.conversationId) {
      await this.prisma.conversation
        .update({ where: { id: link.conversationId }, data: { vacancyId: link.vacancyId, interest: 'INTERESTED' } })
        .catch(() => undefined);
    }

    // Confirmação por WhatsApp (best-effort; não bloqueia a resposta da página).
    if (!alreadyConfirmed && link.conversationId) {
      const nome = (prof.fullName || '').trim().split(/\s+/)[0] || '';
      const cargo = vaga.specialty?.name || vaga.title;
      const msg =
        `Pronto${nome ? ', ' + nome : ''}. Sua candidatura para a vaga de ${cargo} foi confirmada com sucesso. ` +
        `O contratante responsável poderá analisar seu perfil e entrar em contato caso avance para as próximas etapas. ` +
        `Se quiser, posso continuar procurando outras vagas compatíveis com seu perfil.`;
      await this.messaging.sendFromConversation(link.conversationId, msg, { sentByAi: true }).catch(() => undefined);
    }

    return {
      ok: true,
      alreadyConfirmed,
      vaga: this.vagaView(vaga),
      message: 'Sua candidatura foi confirmada com sucesso.',
    };
  }

  // Mínimo para candidatar: nome + WhatsApp. (Cadastros via WhatsApp já têm ambos.)
  private pendingFields(prof: any): string[] {
    const missing: string[] = [];
    if (!prof?.fullName?.trim()) missing.push('nome');
    if (!prof?.whatsapp?.trim()) missing.push('whatsapp');
    return missing;
  }

  private vagaView(v: any) {
    const horas = Math.max(1, Math.round((new Date(v.endsAt).getTime() - new Date(v.startsAt).getTime()) / 3_600_000));
    const tz = process.env.TZ || 'America/Fortaleza';
    return {
      id: v.id,
      titulo: v.title,
      cargo: v.specialty?.name || v.title,
      estabelecimento: UNIT_TYPE_LABEL[v.healthUnit?.type] || 'Unidade de saúde',
      unidade: v.healthUnit?.name ?? null,
      cidade: [v.healthUnit?.city, v.healthUnit?.state].filter(Boolean).join('/') || null,
      modalidade: WORK_MODEL_LABEL[v.workModel] || null,
      contratacao: WORK_MODEL_LABEL[v.workModel] || null,
      cargaHoraria: `${horas}h`,
      escala: v.shiftType ?? null,
      remuneracao: v.doctorAmount != null ? Number(v.doctorAmount) : null,
      moeda: v.currency || 'BRL',
      prioridade: v.priority,
      descricao: v.description ?? null,
      inicio: v.startsAt ? new Date(v.startsAt).toLocaleString('pt-BR', { timeZone: tz }) : null,
    };
  }
}

// Endpoints PÚBLICOS: o token É a autenticação (magic-link). Sem JwtAuthGuard.
@Controller('hotsite')
export class HotsiteController {
  constructor(private readonly service: HotsiteService) {}

  @Get(':token')
  view(@Param('token') token: string, @Req() req: Request) {
    return this.service.view(token, this.meta(req));
  }

  @Post(':token/confirm')
  confirm(@Param('token') token: string, @Req() req: Request) {
    return this.service.confirm(token, this.meta(req));
  }

  private meta(req: Request) {
    const fwd = (req.headers['x-forwarded-for'] as string) || '';
    return {
      ip: (fwd.split(',')[0] || req.ip || '').trim(),
      userAgent: (req.headers['user-agent'] as string) || '',
    };
  }
}

@Module({
  imports: [MessagingModule],
  controllers: [HotsiteController],
  providers: [HotsiteService],
  exports: [HotsiteService],
})
export class HotsiteModule {}
