import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  GoneException,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingModule } from '../messaging/messaging.module';
import { MessagingService } from '../messaging/messaging.service';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const DOC_LABEL: Record<string, string> = {
  registro_profissional: 'Registro profissional',
  identificacao: 'Documento de identificação',
  curriculo: 'Currículo',
  certificado: 'Certificados',
  comprovante_vaga: 'Comprovante exigido pela vaga',
};
const PROF_TYPES = [
  'PHYSICIAN', 'NURSE', 'NURSING_TECHNICIAN', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'NUTRITIONIST',
  'DENTIST', 'PHARMACIST', 'SPEECH_THERAPIST', 'OCCUPATIONAL_THERAPIST', 'SOCIAL_WORKER', 'BIOMEDICAL', 'OTHER',
];

// Etapas do cadastro progressivo (para indicar progresso "faltam X etapas").
const STEPS: { key: string; label: string }[] = [
  { key: 'basic', label: 'Dados básicos' },
  { key: 'professional', label: 'Perfil profissional' },
  { key: 'availability', label: 'Disponibilidade' },
  { key: 'documents', label: 'Documentos' },
];

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  private ttlHours(): number {
    const n = Number(process.env.REGISTRATION_LINK_TTL_HOURS);
    return Number.isFinite(n) && n > 0 ? n : 336; // 14 dias (cadastro leva tempo)
  }
  private baseUrl(): string {
    return (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  }

  /** Cria o magic-link de CADASTRO (kind=REGISTER) para um profissional novo. */
  async createLink(input: { professionalId: string; vacancyId: string; conversationId?: string; channel?: string }) {
    const vaga = await this.prisma.vacancy.findFirst({ where: { id: input.vacancyId, deletedAt: null } });
    if (!vaga) throw new NotFoundException('Vacancy not found');
    const prof = await this.prisma.healthProfessional.findFirst({ where: { id: input.professionalId, deletedAt: null } });
    if (!prof) throw new NotFoundException('Professional not found');
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + this.ttlHours() * 3_600_000);
    await this.prisma.candidacyLink.create({
      data: {
        token, kind: 'REGISTER', professionalId: input.professionalId, vacancyId: input.vacancyId,
        conversationId: input.conversationId, channel: input.channel || 'WHATSAPP', expiresAt,
      },
    });
    return { token, url: `${this.baseUrl()}/cadastro/${token}`, expiresAt };
  }

  private async load(token: string) {
    const link = await this.prisma.candidacyLink.findUnique({ where: { token } });
    if (!link || link.kind !== 'REGISTER') throw new NotFoundException('Link inválido.');
    return link;
  }
  private isExpired(link: any): boolean {
    return link.status === 'ACTIVE' && link.expiresAt.getTime() < Date.now();
  }

  /** Estado do cadastro p/ a página (vaga + rascunho + prefill + progresso + docs). */
  async view(token: string, meta: { ip?: string; userAgent?: string }) {
    const link = await this.load(token);
    await this.prisma.candidacyLink.update({
      where: { id: link.id },
      data: {
        firstAccessedAt: link.firstAccessedAt ?? new Date(), lastAccessedAt: new Date(),
        accessCount: { increment: 1 }, lastUserAgent: meta.userAgent?.slice(0, 300), lastIp: meta.ip?.slice(0, 64),
      },
    });
    return this.buildState(link);
  }

  /** Autosave: mescla o patch no rascunho e persiste progressivamente no perfil/memória. */
  async save(token: string, patch: Record<string, any>) {
    const link = await this.load(token);
    if (link.status === 'CONFIRMED') return this.buildState(link, 'Cadastro já confirmado.');
    const draft = { ...(link.draft as any || {}), ...(patch || {}) };
    await this.prisma.candidacyLink.update({ where: { id: link.id }, data: { draft, draftUpdatedAt: new Date() } });
    await this.persistDraft(link.professionalId, draft);
    const fresh = await this.prisma.candidacyLink.findUnique({ where: { id: link.id } });
    return this.buildState(fresh, 'Cadastro salvo automaticamente.');
  }

  /** Confirmação: exige só os dados MÍNIMOS (docs são complementares). */
  async confirm(token: string, meta: { ip?: string; userAgent?: string }) {
    const link = await this.load(token);
    if (this.isExpired(link)) throw new GoneException('Este link expirou. Peça um novo pelo WhatsApp.');
    await this.persistDraft(link.professionalId, (link.draft as any) || {});
    const prof = await this.prisma.healthProfessional.findUnique({ where: { id: link.professionalId } });
    const mem = await this.prisma.professionalMemory.findUnique({ where: { professionalId: link.professionalId } }).catch(() => null);
    const missing = this.missingMin(prof, (link.draft as any) || {}, mem);
    if (missing.length) throw new BadRequestException(`Faltam dados mínimos: ${missing.join(', ')}.`);

    const vaga = await this.prisma.vacancy.findFirst({ where: { id: link.vacancyId, deletedAt: null }, include: { specialty: true } });
    if (!vaga) throw new NotFoundException('Vaga não encontrada.');
    const docs = await this.currentDocs(link.professionalId);
    // Gating: documentos OBRIGATÓRIOS da vaga precisam estar enviados antes de confirmar.
    const missingDocs = this.missingRequiredDocs(vaga, docs);
    if (missingDocs.length) {
      throw new BadRequestException(`Envie os documentos obrigatórios da vaga antes de confirmar: ${missingDocs.map((k) => DOC_LABEL[k] || k).join(', ')}.`);
    }
    // Apto para candidatura; credencial reflete documentos (obrigatórios enviados → em validação).
    await this.prisma.healthProfessional.update({
      where: { id: link.professionalId },
      data: { status: 'ACTIVE', credentialStatus: docs.length ? 'PENDING_VALIDATION' : 'MISSING_DOCUMENTS' },
    });

    let application = await this.prisma.application.findFirst({ where: { vacancyId: link.vacancyId, professionalId: link.professionalId } });
    if (!application) {
      application = await this.prisma.application.create({
        data: {
          vacancyId: link.vacancyId, professionalId: link.professionalId, origin: 'WHATSAPP_REGISTRATION',
          status: 'PENDING', hasPendingDocuments: docs.length === 0,
        },
      });
    }
    const alreadyConfirmed = link.status === 'CONFIRMED';
    await this.prisma.candidacyLink.update({
      where: { id: link.id },
      data: { status: 'CONFIRMED', confirmedAt: link.confirmedAt ?? new Date(), applicationId: application.id, lastAccessedAt: new Date() },
    });
    if (link.conversationId) {
      await this.prisma.conversation.update({ where: { id: link.conversationId }, data: { vacancyId: link.vacancyId, interest: 'INTERESTED' } }).catch(() => undefined);
    }
    if (!alreadyConfirmed && link.conversationId) {
      const nome = (prof?.fullName || '').trim().split(/\s+/)[0] || '';
      const cargo = vaga.specialty?.name || vaga.title;
      const pend = docs.length ? '' : ' Se ainda houver documentos pendentes, você pode enviá-los depois pelo mesmo link.';
      const msg =
        `Pronto${nome ? ', ' + nome : ''}. Sua candidatura para a vaga de ${cargo} foi confirmada com sucesso. ` +
        `Seu cadastro na HealthMatch também foi criado.${pend} ` +
        `O contratante responsável poderá analisar seu perfil e avançar com as próximas etapas do processo seletivo.`;
      await this.messaging.sendFromConversation(link.conversationId, msg, { sentByAi: true }).catch(() => undefined);
    }
    return { ok: true, alreadyConfirmed, pendingDocuments: docs.length === 0, message: 'Sua candidatura foi confirmada com sucesso.' };
  }

  /** Upload real de documento (PDF/JPG/PNG) p/ o volume; substitui versão anterior do mesmo tipo. */
  async addDocument(token: string, file: any, kind: string, label?: string) {
    const link = await this.load(token);
    if (!file) throw new BadRequestException('Arquivo não enviado.');
    if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException('Formato inválido. Envie PDF, JPG ou PNG.');
    const safeKind = (kind || 'documento').replace(/[^a-z0-9_]/gi, '_').slice(0, 40);
    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = file.originalname?.includes('.') ? file.originalname.split('.').pop()!.slice(0, 8) : 'bin';
    const storageKey = `${link.professionalId}/${randomBytes(8).toString('hex')}.${ext}`;
    await mkdir(join(UPLOAD_DIR, link.professionalId), { recursive: true });
    await writeFile(join(UPLOAD_DIR, storageKey), file.buffer);
    // Substitui a versão anterior do mesmo tipo (mantém histórico via supersededAt).
    await this.prisma.professionalDocument.updateMany({
      where: { professionalId: link.professionalId, kind: safeKind, supersededAt: null },
      data: { supersededAt: new Date() },
    });
    const doc = await this.prisma.professionalDocument.create({
      data: {
        professionalId: link.professionalId, candidacyLinkId: link.id, kind: safeKind, label: label?.slice(0, 80),
        fileName: (file.originalname || 'arquivo').slice(0, 160), mimeType: file.mimetype, size: file.size, storageKey, status: 'SENT',
      },
    });
    return { id: doc.id, kind: doc.kind, fileName: doc.fileName, status: doc.status, createdAt: doc.createdAt };
  }

  // ---------- helpers ----------

  private async currentDocs(professionalId: string) {
    return this.prisma.professionalDocument.findMany({
      where: { professionalId, supersededAt: null }, orderBy: { createdAt: 'desc' },
    });
  }

  // Documentos obrigatórios da vaga ainda NÃO enviados (kinds presentes nos docs atuais).
  private missingRequiredDocs(vaga: any, docs: any[]): string[] {
    const required: string[] = vaga?.requiredDocuments || [];
    if (!required.length) return [];
    const sent = new Set(docs.map((d) => d.kind));
    return required.filter((k) => !sent.has(k));
  }

  private missingMin(prof: any, draft: any, mem?: any): string[] {
    const nome = (draft.fullName || prof?.fullName || '').trim();
    const cidade = (draft.city || prof?.city || '').trim();
    // Profissão já informada pelo WhatsApp (memória) também conta — não repetir pergunta.
    const profissao =
      (draft.profession || '').trim() ||
      (mem?.profession || '').trim() ||
      (prof?.professionalType && prof.professionalType !== 'OTHER' ? prof.professionalType : '');
    const m: string[] = [];
    if (!nome || /^contato\s/i.test(nome)) m.push('nome completo');
    if (!profissao) m.push('profissão');
    if (!cidade) m.push('cidade');
    return m;
  }

  // Persiste campos conhecidos do rascunho no perfil + memória (durável e cross-device).
  private async persistDraft(professionalId: string, draft: any) {
    const data: any = {};
    if (draft.fullName?.trim()) data.fullName = draft.fullName.trim();
    if (draft.cpf?.trim()) data.cpf = draft.cpf.trim();
    if (draft.email?.trim()) data.email = draft.email.trim();
    if (draft.city?.trim()) data.city = draft.city.trim();
    if (draft.state?.trim()) data.state = draft.state.trim().toUpperCase().slice(0, 2);
    if (draft.birthDate) { const d = new Date(draft.birthDate); if (!isNaN(d.getTime())) data.birthDate = d; }
    if (draft.professionalType && PROF_TYPES.includes(draft.professionalType)) data.professionalType = draft.professionalType;
    if (draft.councilNumber?.trim()) data.councilNumber = draft.councilNumber.trim();
    if (draft.crmNumber?.trim()) data.crmNumber = draft.crmNumber.trim();
    if (Object.keys(data).length) {
      await this.prisma.healthProfessional.update({ where: { id: professionalId }, data }).catch(() => undefined);
    }
    // Campos de texto livre vão para a memória (profissão/especialidade/disponibilidade/preferências).
    const mem: any = {};
    if (draft.profession?.trim()) mem.profession = draft.profession.trim();
    if (draft.specialtyName?.trim()) mem.specialtyName = draft.specialtyName.trim();
    if (draft.availability?.trim()) mem.availability = draft.availability.trim();
    if (draft.contractType?.trim()) mem.vacancyPreferences = draft.contractType.trim();
    if (draft.regionPreference?.trim()) mem.vacancyPreferences = [mem.vacancyPreferences, draft.regionPreference.trim()].filter(Boolean).join(' · ');
    if (Object.keys(mem).length) {
      await this.prisma.professionalMemory.upsert({
        where: { professionalId }, create: { professionalId, ...mem }, update: mem,
      }).catch(() => undefined);
    }
  }

  private async buildState(link: any, savedMessage?: string) {
    const vaga = await this.prisma.vacancy.findUnique({ where: { id: link.vacancyId }, include: { healthUnit: true, specialty: true } });
    const prof = await this.prisma.healthProfessional.findUnique({ where: { id: link.professionalId } });
    const mem = await this.prisma.professionalMemory.findUnique({ where: { professionalId: link.professionalId } }).catch(() => null);
    const draft = (link.draft as any) || {};
    const docs = await this.currentDocs(link.professionalId);

    // Sugestões (prefill) do que já se sabe pelo WhatsApp — evita repetir perguntas.
    const suggested = {
      fullName: prof?.fullName && !/^contato\s/i.test(prof.fullName) ? prof.fullName : '',
      whatsapp: prof?.whatsapp || '',
      email: prof?.email || '',
      city: prof?.city || '',
      state: prof?.state || '',
      profession: mem?.profession || '',
      specialtyName: mem?.specialtyName || '',
      availability: mem?.availability || '',
    };
    const missing = this.missingMin(prof, draft, mem);
    const requiredDocuments: string[] = (vaga as any)?.requiredDocuments || [];
    const missingRequiredDocs = this.missingRequiredDocs(vaga, docs);
    const status = link.status === 'CONFIRMED' ? 'confirmed' : this.isExpired(link) ? 'expired' : 'active';

    const get = (k: string) => (draft[k] ?? (suggested as any)[k] ?? '');
    const stepDone: Record<string, boolean> = {
      basic: !!get('fullName') && !/^contato\s/i.test(String(get('fullName'))),
      professional: !!get('profession') && !!get('city'),
      availability: !!get('availability'),
      // Etapa de documentos só é "concluída" com os obrigatórios enviados (ou sem exigência).
      documents: missingRequiredDocs.length === 0 && (requiredDocuments.length > 0 || docs.length > 0),
    };
    const steps = STEPS.map((s) => ({ ...s, done: stepDone[s.key] }));
    // "Faltam X etapas para confirmar": básico + profissional + (documentos se a vaga exigir).
    const essential = ['basic', 'professional', ...(requiredDocuments.length ? ['documents'] : [])];
    const remainingToConfirm = essential.filter((k) => !stepDone[k]).length;

    // Só confirma com dados mínimos E documentos obrigatórios enviados.
    const canConfirm = missing.length === 0 && missingRequiredDocs.length === 0;

    return {
      status,
      expiresAt: link.expiresAt,
      confirmedAt: link.confirmedAt,
      savedMessage,
      message: savedMessage,
      professional: { firstName: (suggested.fullName || 'Profissional').split(/\s+/)[0] },
      vaga: vaga ? { cargo: vaga.specialty?.name || vaga.title, titulo: vaga.title, cidade: [vaga.healthUnit?.city, vaga.healthUnit?.state].filter(Boolean).join('/') || vaga.healthUnit?.name || null } : null,
      draft, suggested,
      missingMin: missing, canConfirm,
      requiredDocuments, missingRequiredDocs,
      steps, remainingToConfirm,
      documents: docs.map((d) => ({ id: d.id, kind: d.kind, fileName: d.fileName, status: d.status, createdAt: d.createdAt })),
    };
  }
}

// Endpoints PÚBLICOS do cadastro (token = autenticação) + endpoint AUTENTICADO p/ o contratante.
@Controller()
export class RegistrationController {
  constructor(
    private readonly service: RegistrationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('cadastro/:token')
  view(@Param('token') token: string, @Req() req: Request) {
    return this.service.view(token, this.meta(req));
  }

  @Post('cadastro/:token')
  save(@Param('token') token: string, @Body() body: any) {
    return this.service.save(token, body || {});
  }

  @Post('cadastro/:token/confirm')
  confirm(@Param('token') token: string, @Req() req: Request) {
    return this.service.confirm(token, this.meta(req));
  }

  @Post('cadastro/:token/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  upload(@Param('token') token: string, @UploadedFile() file: any, @Body() body: any) {
    return this.service.addDocument(token, file, body?.kind || 'documento', body?.label);
  }

  // Contratante: documentos de um profissional candidato (autenticado).
  @Get('registration/professionals/:id/documents')
  @UseGuards(JwtAuthGuard)
  proDocs(@Param('id') id: string) {
    return this.prisma.professionalDocument.findMany({
      where: { professionalId: id, supersededAt: null }, orderBy: { createdAt: 'desc' },
    });
  }

  private meta(req: Request) {
    const fwd = (req.headers['x-forwarded-for'] as string) || '';
    return { ip: (fwd.split(',')[0] || req.ip || '').trim(), userAgent: (req.headers['user-agent'] as string) || '' };
  }
}

@Module({
  imports: [MessagingModule],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [RegistrationService],
})
export class RegistrationModule {}
