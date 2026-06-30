import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  OnModuleInit,
  Param,
  Post,
  Patch,
  Query,
  Req,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IsArray, IsIn, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingModule } from '../matching/matching.module';
import { MatchingService } from '../matching/matching.service';
import { RegistrationModule, RegistrationService } from '../registration/registration.module';
import { HotsiteModule, HotsiteService } from '../hotsite/hotsite.module';
import { domainEvents, DomainEventType } from './domain-events';

const ALL_SCOPES = [
  'vacancies:read',
  'professionals:read',
  'professionals:write',
  'matching:read',
  'applications:read',
  'applications:write',
  'links:write',
];
const EVENT_TYPES: DomainEventType[] = ['application.created', 'application.status_changed', 'vacancy.status_changed'];

function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

// ----------------------------- Auth do parceiro -----------------------------
const SCOPE_KEY = 'partner_scope';
const RequireScope = (scope: string) => SetMetadata(SCOPE_KEY, scope);

@Injectable()
export class PartnerAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { partner?: any }>();
    const auth = (req.headers['authorization'] as string) || '';
    const headerKey = (req.headers['x-api-key'] as string) || '';
    const key = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : headerKey.trim();
    if (!key) throw new UnauthorizedException('API key ausente (Authorization: Bearer <key> ou X-Api-Key).');

    const partner = await this.prisma.partner.findUnique({ where: { apiKeyHash: sha256(key) } });
    if (!partner || !partner.active) throw new UnauthorizedException('API key inválida ou parceiro inativo.');

    const required = this.reflector.get<string>(SCOPE_KEY, ctx.getHandler());
    const scopes = partner.scopes || [];
    const allowed = scopes.length === 0 || scopes.includes('*') || (required ? scopes.includes(required) : true);
    if (!allowed) throw new ForbiddenException(`Escopo necessário: ${required}.`);

    req.partner = partner;
    this.prisma.partner.update({ where: { id: partner.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    return true;
  }
}

// ----------------------------- Serviço de parceiros -----------------------------
class CreatePartnerDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsArray() @IsString({ each: true }) scopes?: string[];
  @IsOptional() @IsUrl({ require_tld: false }) webhookUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) events?: string[];
}
class UpdatePartnerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) scopes?: string[];
  @IsOptional() @IsUrl({ require_tld: false }) webhookUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) events?: string[];
  @IsOptional() active?: boolean;
}

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  private newKey() {
    const key = `hm_live_${randomBytes(24).toString('hex')}`;
    return { key, hash: sha256(key), prefix: key.slice(0, 14) };
  }
  private newSecret() {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }
  private redact(p: any) {
    const { apiKeyHash, webhookSecret, ...rest } = p;
    return { ...rest, hasWebhookSecret: !!webhookSecret };
  }

  async create(dto: CreatePartnerDto) {
    const { key, hash, prefix } = this.newKey();
    const webhookSecret = dto.webhookUrl ? this.newSecret() : null;
    const partner = await this.prisma.partner.create({
      data: {
        name: dto.name,
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
        scopes: dto.scopes ?? ['*'],
        webhookUrl: dto.webhookUrl,
        webhookSecret,
        events: dto.events ?? (dto.webhookUrl ? EVENT_TYPES : []),
      },
    });
    // chave e segredo em claro são exibidos UMA ÚNICA VEZ na criação.
    return { ...this.redact(partner), apiKey: key, webhookSecret };
  }

  async list(q: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.partner.findMany({ orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.partner.count(),
    ]);
    return paginate(data.map((p) => this.redact(p)), total, q.page, q.limit);
  }

  async get(id: string) {
    const p = await this.prisma.partner.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Partner not found');
    return this.redact(p);
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.get(id);
    const data: any = { ...dto };
    // ativar webhook sem segredo → gera um.
    if (dto.webhookUrl) {
      const cur = await this.prisma.partner.findUnique({ where: { id } });
      if (!cur?.webhookSecret) data.webhookSecret = this.newSecret();
    }
    const p = await this.prisma.partner.update({ where: { id }, data });
    return this.redact(p);
  }

  async rotateKey(id: string) {
    await this.get(id);
    const { key, hash, prefix } = this.newKey();
    await this.prisma.partner.update({ where: { id }, data: { apiKeyHash: hash, apiKeyPrefix: prefix } });
    return { id, apiKey: key, apiKeyPrefix: prefix };
  }

  async rotateWebhookSecret(id: string) {
    await this.get(id);
    const webhookSecret = this.newSecret();
    await this.prisma.partner.update({ where: { id }, data: { webhookSecret } });
    return { id, webhookSecret };
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.partner.delete({ where: { id } });
    return { success: true };
  }
}

// ----------------------------- Eventos de saída (push) -----------------------------
@Injectable()
export class ConnectorEventsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    for (const type of EVENT_TYPES) {
      domainEvents.on(type, (record: any) => void this.handle(type, record).catch(() => undefined));
    }
  }

  private async handle(type: DomainEventType, record: any) {
    const partners = await this.prisma.partner.findMany({ where: { active: true, NOT: { webhookUrl: null } } });
    const targets = partners.filter((p) => (p.events?.length ? p.events.includes(type) : true) && p.webhookUrl);
    if (!targets.length) return;
    const data = await this.buildPayload(type, record);
    await Promise.all(targets.map((p) => this.deliver(p, type, data)));
  }

  private async buildPayload(type: DomainEventType, record: any) {
    if (type.startsWith('application')) {
      const vaga = record?.vacancyId
        ? await this.prisma.vacancy.findUnique({ where: { id: record.vacancyId }, select: { id: true, code: true, title: true } }).catch(() => null)
        : null;
      const prof = record?.professionalId
        ? await this.prisma.healthProfessional.findUnique({ where: { id: record.professionalId }, select: { id: true, fullName: true, whatsapp: true } }).catch(() => null)
        : null;
      return {
        applicationId: record.id,
        status: record.status,
        origin: record.origin,
        vacancy: vaga,
        professional: prof,
        updatedAt: record.updatedAt ?? record.createdAt,
      };
    }
    return { vacancyId: record.id, code: record.code, title: record.title, status: record.status };
  }

  private async deliver(partner: any, type: string, data: any) {
    const body = JSON.stringify({ id: randomUUID(), type, createdAt: new Date().toISOString(), data });
    const sig = partner.webhookSecret ? 'sha256=' + createHmac('sha256', partner.webhookSecret).update(body).digest('hex') : '';
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), Number(process.env.CONNECTOR_WEBHOOK_TIMEOUT_MS ?? 5000));
      await fetch(partner.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HealthMatch-Event': type,
          'X-HealthMatch-Signature': sig,
          'X-HealthMatch-Delivery': randomUUID(),
          'User-Agent': 'HealthMatch-Connector/1',
        },
        body,
        signal: ctrl.signal,
      }).finally(() => clearTimeout(to));
    } catch {
      /* best-effort: entrega de evento não bloqueia nem falha a operação de origem */
    }
  }
}

// ----------------------------- API do Conector (parceiro) -----------------------------
class IdentifyDto {
  @IsString() @MinLength(8) whatsapp: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() email?: string;
}
class ApplyDto {
  @IsString() professionalId: string;
  @IsString() vacancyId: string;
  @IsOptional() @IsString() notes?: string;
}
class MatchDto {
  @IsString() professionalId: string;
}
class LinkDto {
  @IsIn(['registration', 'hotsite']) type: 'registration' | 'hotsite';
  @IsString() professionalId: string;
  @IsString() vacancyId: string;
}

@Injectable()
export class ConnectorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly registration: RegistrationService,
    private readonly hotsite: HotsiteService,
  ) {}

  private vagaView(v: any) {
    const horas = v.startsAt && v.endsAt ? Math.max(1, Math.round((new Date(v.endsAt).getTime() - new Date(v.startsAt).getTime()) / 3_600_000)) : null;
    return {
      id: v.id, code: v.code, title: v.title, status: v.status, priority: v.priority,
      specialty: v.specialty?.name ?? null,
      healthUnit: v.healthUnit ? { name: v.healthUnit.name, type: v.healthUnit.type, city: v.healthUnit.city, state: v.healthUnit.state } : null,
      organization: v.organization?.name ?? null,
      workModel: v.workModel, shiftType: v.shiftType,
      startsAt: v.startsAt, endsAt: v.endsAt, cargaHorariaHoras: horas,
      requiredDoctors: v.requiredDoctors, filledDoctors: v.filledDoctors,
      doctorAmount: v.doctorAmount != null ? Number(v.doctorAmount) : null,
      clientAmount: v.clientAmount != null ? Number(v.clientAmount) : null,
      currency: v.currency, requiredDocuments: v.requiredDocuments ?? [],
      description: v.description ?? null,
    };
  }
  private profView(p: any, mem?: any) {
    return {
      id: p.id, fullName: p.fullName, whatsapp: p.whatsapp, email: p.email,
      city: p.city, state: p.state, professionalType: p.professionalType,
      mainSpecialty: p.mainSpecialty?.name ?? null,
      status: p.status, credentialStatus: p.credentialStatus,
      cadastroCompleto: p.status === 'ACTIVE',
      memory: mem ? { profession: mem.profession, specialtyName: mem.specialtyName, availability: mem.availability, vacancyPreferences: mem.vacancyPreferences } : undefined,
    };
  }

  async listVacancies(q: PaginationDto, filter: { status?: string; city?: string; specialtyId?: string }) {
    const where: any = { deletedAt: null, status: filter.status ?? { in: ['OPEN', 'MATCHING', 'CONTACTING', 'RECEIVING_APPLICATIONS', 'PARTIALLY_FILLED'] } };
    if (filter.specialtyId) where.specialtyId = filter.specialtyId;
    if (filter.city) where.healthUnit = { city: { contains: filter.city, mode: 'insensitive' } };
    const [data, total] = await Promise.all([
      this.prisma.vacancy.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit, include: { healthUnit: true, specialty: true, organization: true } }),
      this.prisma.vacancy.count({ where }),
    ]);
    return paginate(data.map((v) => this.vagaView(v)), total, q.page, q.limit);
  }

  async getVacancy(id: string) {
    const v = await this.prisma.vacancy.findFirst({ where: { id, deletedAt: null }, include: { healthUnit: true, specialty: true, organization: true } });
    if (!v) throw new NotFoundException('Vacancy not found');
    return this.vagaView(v);
  }

  async identify(dto: IdentifyDto) {
    const digits = dto.whatsapp.replace(/\D/g, '');
    let prof = await this.prisma.healthProfessional.findFirst({ where: { whatsapp: { contains: digits.slice(-8) }, deletedAt: null } });
    let created = false;
    if (!prof) {
      prof = await this.prisma.healthProfessional.create({
        data: {
          fullName: dto.fullName?.trim() || `Contato ${digits.slice(-4)}`,
          whatsapp: dto.whatsapp, email: dto.email,
          professionalType: 'OTHER', status: 'INCOMPLETE', origin: 'SELF_SIGNUP', metrics: { create: {} },
        },
      });
      created = true;
    }
    const mem = await this.prisma.professionalMemory.findUnique({ where: { professionalId: prof.id } }).catch(() => null);
    return { created, professional: this.profView(prof, mem) };
  }

  async getProfessional(id: string) {
    const p = await this.prisma.healthProfessional.findFirst({ where: { id, deletedAt: null }, include: { mainSpecialty: true } });
    if (!p) throw new NotFoundException('Professional not found');
    const mem = await this.prisma.professionalMemory.findUnique({ where: { professionalId: id } }).catch(() => null);
    const apps = await this.prisma.application.findMany({ where: { professionalId: id }, include: { vacancy: { select: { id: true, title: true, code: true } } }, orderBy: { createdAt: 'desc' } });
    const docs = await this.prisma.professionalDocument.findMany({ where: { professionalId: id, supersededAt: null }, select: { kind: true, status: true, fileName: true } });
    return {
      ...this.profView(p, mem),
      applications: apps.map((a) => ({ id: a.id, vacancy: a.vacancy, origin: a.origin, status: a.status, createdAt: a.createdAt })),
      documents: docs,
    };
  }

  async matchForProfessional(dto: MatchDto) {
    const matches = await this.matching.scoreProfessional(dto.professionalId, 5);
    return matches.map((m: any) => ({ ...this.vagaView(m.vacancy), aderencia: m.score, porQueCombina: m.positiveReasons }));
  }

  async apply(dto: ApplyDto, partner: any) {
    const v = await this.prisma.vacancy.findFirst({ where: { id: dto.vacancyId, deletedAt: null } });
    if (!v) throw new NotFoundException('Vacancy not found');
    const p = await this.prisma.healthProfessional.findFirst({ where: { id: dto.professionalId, deletedAt: null } });
    if (!p) throw new NotFoundException('Professional not found');
    const exists = await this.prisma.application.findFirst({ where: { vacancyId: dto.vacancyId, professionalId: dto.professionalId } });
    if (exists) return { id: exists.id, status: exists.status, origin: exists.origin, alreadyExists: true };
    const app = await this.prisma.application.create({
      data: {
        vacancyId: dto.vacancyId, professionalId: dto.professionalId, origin: 'PARTNER', status: 'PENDING',
        notes: dto.notes ? `[${partner.name}] ${dto.notes}`.slice(0, 500) : `[${partner.name}]`,
      },
    });
    return { id: app.id, status: app.status, origin: app.origin, alreadyExists: false };
  }

  async getApplication(id: string) {
    const a = await this.prisma.application.findUnique({ where: { id }, include: { vacancy: { select: { id: true, title: true, code: true } }, professional: { select: { id: true, fullName: true } } } });
    if (!a) throw new NotFoundException('Application not found');
    return { id: a.id, status: a.status, origin: a.origin, vacancy: a.vacancy, professional: a.professional, hasPendingDocuments: a.hasPendingDocuments, createdAt: a.createdAt, updatedAt: a.updatedAt };
  }

  async listApplications(professionalId?: string, vacancyId?: string) {
    const where: any = {};
    if (professionalId) where.professionalId = professionalId;
    if (vacancyId) where.vacancyId = vacancyId;
    const items = await this.prisma.application.findMany({ where, include: { vacancy: { select: { id: true, title: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return items.map((a) => ({ id: a.id, status: a.status, origin: a.origin, vacancy: a.vacancy, createdAt: a.createdAt }));
  }

  async makeLink(dto: LinkDto) {
    if (dto.type === 'registration') return this.registration.createLink({ professionalId: dto.professionalId, vacancyId: dto.vacancyId, channel: 'PARTNER' });
    return this.hotsite.createLink({ professionalId: dto.professionalId, vacancyId: dto.vacancyId, channel: 'PARTNER' });
  }
}

@Controller('connector/v1')
@UseGuards(PartnerAuthGuard)
export class ConnectorController {
  constructor(private readonly svc: ConnectorService) {}

  @Get('health')
  health(@Req() req: any) {
    return { ok: true, partner: req.partner?.name, scopes: req.partner?.scopes, time: new Date().toISOString() };
  }

  @Get('vacancies')
  @RequireScope('vacancies:read')
  vacancies(@Query() q: PaginationDto, @Query('status') status?: string, @Query('city') city?: string, @Query('specialtyId') specialtyId?: string) {
    return this.svc.listVacancies(q, { status, city, specialtyId });
  }

  @Get('vacancies/:id')
  @RequireScope('vacancies:read')
  vacancy(@Param('id') id: string) {
    return this.svc.getVacancy(id);
  }

  @Post('professionals/identify')
  @HttpCode(200)
  @RequireScope('professionals:write')
  identify(@Body() dto: IdentifyDto) {
    return this.svc.identify(dto);
  }

  @Get('professionals/:id')
  @RequireScope('professionals:read')
  professional(@Param('id') id: string) {
    return this.svc.getProfessional(id);
  }

  @Post('matching/vacancies-for-professional')
  @HttpCode(200)
  @RequireScope('matching:read')
  match(@Body() dto: MatchDto) {
    return this.svc.matchForProfessional(dto);
  }

  @Post('applications')
  @HttpCode(201)
  @RequireScope('applications:write')
  apply(@Body() dto: ApplyDto, @Req() req: any) {
    return this.svc.apply(dto, req.partner);
  }

  @Get('applications/:id')
  @RequireScope('applications:read')
  application(@Param('id') id: string) {
    return this.svc.getApplication(id);
  }

  @Get('applications')
  @RequireScope('applications:read')
  applications(@Query('professionalId') professionalId?: string, @Query('vacancyId') vacancyId?: string) {
    return this.svc.listApplications(professionalId, vacancyId);
  }

  @Post('links')
  @HttpCode(201)
  @RequireScope('links:write')
  link(@Body() dto: LinkDto) {
    return this.svc.makeLink(dto);
  }
}

// ----------------------------- Admin de parceiros (JWT) -----------------------------
@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersAdminController {
  constructor(private readonly svc: PartnerService) {}

  @Get('available-scopes')
  scopes() {
    return { scopes: ALL_SCOPES, events: EVENT_TYPES };
  }
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePartnerDto) {
    return this.svc.create(dto);
  }
  @Get()
  list(@Query() q: PaginationDto) {
    return this.svc.list(q);
  }
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.svc.update(id, dto);
  }
  @Post(':id/rotate-key')
  rotateKey(@Param('id') id: string) {
    return this.svc.rotateKey(id);
  }
  @Post(':id/rotate-webhook-secret')
  rotateSecret(@Param('id') id: string) {
    return this.svc.rotateWebhookSecret(id);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

@Module({
  imports: [MatchingModule, RegistrationModule, HotsiteModule],
  controllers: [ConnectorController, PartnersAdminController],
  providers: [PartnerService, PartnerAuthGuard, ConnectorService, ConnectorEventsService],
  exports: [ConnectorEventsService],
})
export class ConnectorModule {}
