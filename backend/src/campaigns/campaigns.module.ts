import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingModule } from '../matching/matching.module';
import { MatchingService } from '../matching/matching.service';
import { ConversationsModule, ConversationsService } from '../conversations/conversations.module';

const UNIT_TYPE_LABEL: Record<string, string> = {
  CLINIC: 'clínica',
  HOSPITAL: 'hospital',
  UPA: 'UPA',
  BASIC_HEALTH_UNIT: 'unidade básica de saúde',
  DIAGNOSTIC_CENTER: 'centro de diagnóstico',
  OTHER: 'unidade de saúde',
};
const WORK_MODEL_LABEL: Record<string, string> = {
  ONSITE: 'presencial',
  REMOTE: 'remoto',
  HYBRID: 'híbrido',
};

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly conversations: ConversationsService,
  ) {}

  private maxContacts(): number {
    const n = Number(process.env.CAMPAIGN_MAX_CONTACTS);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
  }

  /**
   * Publica a vaga e dispara a busca + contato automático: matching → filtra
   * elegíveis (com WhatsApp e sem opt-out) → top N por aderência → abordagem por
   * WhatsApp com IA. Idempotente por profissional (reusa a conversa aberta).
   */
  async publish(id: string) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id, deletedAt: null },
      include: { healthUnit: true, specialty: true },
    });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    // Critério de aceite: sem campos obrigatórios suficientes → não publica e diz quais.
    const missing: string[] = [];
    if (!vacancy.title?.trim()) missing.push('título');
    if (!vacancy.healthUnitId) missing.push('unidade de saúde');
    if (!vacancy.startsAt) missing.push('início');
    if (!vacancy.endsAt) missing.push('fim');
    if (!vacancy.requiredDoctors || vacancy.requiredDoctors < 1) missing.push('quantidade de vagas');
    if (missing.length) {
      throw new BadRequestException(`Campos obrigatórios faltando para publicar: ${missing.join(', ')}.`);
    }

    // Busca + classificação dos profissionais.
    const scored = await this.matching.scoreVacancy(id, 1000);
    const eligible = scored.filter((s) => s.eligible);
    const optedOut = eligible.filter((s) => (s.doctor as any)?.doNotContact);
    const noWhatsapp = eligible.filter((s) => !(s.doctor as any)?.whatsapp && !(s.doctor as any)?.doNotContact);
    const contactable = eligible.filter((s) => (s.doctor as any)?.whatsapp && !(s.doctor as any)?.doNotContact);
    const selected = contactable.slice(0, this.maxContacts());

    // Estado publicado (recebendo candidaturas). Sem elegíveis → sinaliza revisão humana.
    const status = selected.length ? 'RECEIVING_APPLICATIONS' : 'PENDING_HUMAN_REVIEW';
    await this.prisma.vacancy.update({ where: { id }, data: { status: status as any } });

    const contacted: any[] = [];
    for (const s of selected) {
      try {
        const conv = await this.conversations.startOutreach({
          vacancyId: id,
          professionalId: s.doctorId,
          message: this.campaignMessage(vacancy, s.doctor),
          sendOpener: true,
        });
        contacted.push({
          professionalId: s.doctorId,
          name: (s.doctor as any)?.fullName,
          score: s.score,
          conversationId: conv.id,
          openerSent: (conv as any).openerSent,
        });
      } catch (e) {
        contacted.push({ professionalId: s.doctorId, name: (s.doctor as any)?.fullName, error: (e as Error).message });
      }
    }

    return {
      vacancyId: id,
      status,
      eligibleCount: eligible.length,
      contactedCount: contacted.filter((c) => !c.error).length,
      contacted,
      skipped: {
        optOut: optedOut.map((s) => ({ professionalId: s.doctorId, name: (s.doctor as any)?.fullName })),
        semWhatsapp: noWhatsapp.map((s) => ({ professionalId: s.doctorId, name: (s.doctor as any)?.fullName })),
      },
      message: selected.length
        ? `${contacted.filter((c) => !c.error).length} profissional(is) contatado(s) por WhatsApp.`
        : 'Nenhum profissional compatível encontrado para contato automático.',
    };
  }

  /**
   * Funil da vaga: encontrados, contatados, responderam, interessados, sem
   * interesse e sem resposta — calculado de matching + conversas + candidaturas.
   */
  async funnel(id: string) {
    const vacancy = await this.prisma.vacancy.findFirst({ where: { id, deletedAt: null } });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    const scored = await this.matching.scoreVacancy(id, 1000);
    const eligible = scored.filter((s) => s.eligible);
    const scoreByProf = new Map(scored.map((s) => [s.doctorId, s.score]));

    const convs = await this.prisma.conversation.findMany({
      where: { vacancyId: id },
      include: { professional: true, messages: { select: { direction: true } } },
    });
    const apps = await this.prisma.application.findMany({ where: { vacancyId: id }, select: { professionalId: true } });
    const interestedByApp = new Set(apps.map((a) => a.professionalId));

    const byProf = new Map<string, any>();
    // Base: todos os elegíveis (encontrados), mesmo que ainda não contatados.
    for (const s of eligible) {
      byProf.set(s.doctorId, {
        professionalId: s.doctorId,
        name: (s.doctor as any)?.fullName,
        score: s.score,
        found: true,
        contacted: false,
        responded: false,
        interested: false,
        notInterested: false,
      });
    }
    // Sobrepõe com os sinais reais das conversas da vaga.
    for (const c of convs) {
      if (!c.professionalId) continue;
      const outbound = c.messages.some((m) => m.direction === 'OUTBOUND');
      const inbound = c.messages.some((m) => m.direction === 'INBOUND');
      const interested = interestedByApp.has(c.professionalId) || c.interest === 'INTERESTED';
      const notInterested = !interested && c.interest === 'NOT_INTERESTED';
      const prev = byProf.get(c.professionalId) || {
        professionalId: c.professionalId,
        name: c.professional?.fullName,
        score: scoreByProf.get(c.professionalId) ?? null,
        found: false,
      };
      byProf.set(c.professionalId, {
        ...prev,
        name: prev.name ?? c.professional?.fullName,
        contacted: outbound,
        responded: inbound,
        interested,
        notInterested,
        conversationId: c.id,
      });
    }

    const list = Array.from(byProf.values()).map((p) => ({ ...p, stage: this.stage(p) }));
    const counts = {
      encontrados: list.length,
      contatados: list.filter((p) => p.contacted).length,
      responderam: list.filter((p) => p.responded).length,
      interessados: list.filter((p) => p.interested).length,
      semInteresse: list.filter((p) => p.notInterested).length,
      semResposta: list.filter((p) => p.contacted && !p.responded).length,
    };
    return { vacancyId: id, status: vacancy.status, counts, professionals: list };
  }

  private stage(p: any): string {
    if (p.interested) return 'INTERESSADO';
    if (p.notInterested) return 'SEM_INTERESSE';
    if (p.responded) return 'RESPONDEU';
    if (p.contacted) return 'CONTATADO';
    return 'ENCONTRADO';
  }

  private campaignMessage(vacancy: any, prof: any): string {
    const nome = (prof?.fullName || '').trim().split(/\s+/)[0] || 'tudo bem';
    const estab = UNIT_TYPE_LABEL[vacancy.healthUnit?.type] || 'unidade de saúde';
    const cargo = vacancy.specialty?.name || vacancy.title;
    const local =
      [vacancy.healthUnit?.city, vacancy.healthUnit?.state].filter(Boolean).join('/') ||
      vacancy.healthUnit?.name ||
      'a combinar';
    const horas = Math.max(1, Math.round((new Date(vacancy.endsAt).getTime() - new Date(vacancy.startsAt).getTime()) / 3_600_000));
    const contrat = WORK_MODEL_LABEL[vacancy.workModel] || 'a combinar';
    const rem = vacancy.doctorAmount
      ? ` A remuneração prevista é de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: vacancy.currency || 'BRL' }).format(Number(vacancy.doctorAmount))}.`
      : '';
    const unidade = vacancy.healthUnit?.name ? ` (${vacancy.healthUnit.name})` : '';
    return (
      `Olá, ${nome}. Tudo bem?\n\n` +
      `Aqui é a HealthMatch. Encontramos uma oportunidade que pode combinar com o seu perfil profissional.\n\n` +
      `Uma ${estab}${unidade} está buscando um(a) ${cargo} para atuar em ${local}, com carga horária de ${horas}h ` +
      `e modelo de contratação ${contrat}.${rem}\n\n` +
      `Pelo seu perfil, você atende aos principais requisitos da vaga.\n\n` +
      `Você tem interesse em saber mais e participar desse processo seletivo?`
    );
  }
}

// Rotas adicionais sob /vacancies (Nest mescla com o VacanciesController).
@Controller('vacancies')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Post(':id/publish')
  @HttpCode(201)
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Get(':id/funnel')
  funnel(@Param('id') id: string) {
    return this.service.funnel(id);
  }
}

@Module({
  imports: [MatchingModule, ConversationsModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
