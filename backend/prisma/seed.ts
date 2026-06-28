import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ---------------------------------------------------------------- Admin
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@healthmatch.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      fullName: 'Administrador',
      role: 'ADMIN',
      profile: { create: { displayName: 'Administrador' } },
    },
  });

  // -------------------------------------------------- Organização / unidades
  await prisma.organization.upsert({
    where: { id: 'organization-saude-nordeste' },
    update: {},
    create: {
      id: 'organization-saude-nordeste',
      name: 'Saúde Nordeste Gestão',
      type: 'HEALTH_CORPORATION',
      status: 'ACTIVE',
    },
  });
  await prisma.publicAgency.upsert({
    where: { id: 'agency-prefeitura-fortaleza' },
    update: {},
    create: { id: 'agency-prefeitura-fortaleza', name: 'Prefeitura de Fortaleza', organizationId: 'organization-saude-nordeste' },
  });

  const units: { id: string; name: string; type: any }[] = [
    { id: 'health-unit-clinica-aurora', name: 'Clínica Aurora', type: 'CLINIC' },
    { id: 'health-unit-centro-diagnostico-medmatch', name: 'Centro Diagnóstico HealthMatch', type: 'DIAGNOSTIC_CENTER' },
    { id: 'health-unit-upa-leste', name: 'UPA Leste', type: 'UPA' },
    { id: 'health-unit-clinica-vida-plena', name: 'Clínica Vida Plena', type: 'CLINIC' },
    { id: 'health-unit-hospital-sao-gabriel', name: 'Hospital São Gabriel', type: 'HOSPITAL' },
  ];
  for (const u of units) {
    await prisma.healthUnit.upsert({
      where: { id: u.id },
      update: {},
      create: { ...u, status: 'ACTIVE', organizationId: 'organization-saude-nordeste' },
    });
  }

  // --------------------------------------------- Especialidades / CBO / docs
  const specs: { id: string; name: string }[] = [
    { id: 'spec-clinica-medica', name: 'Clínica Médica' },
    { id: 'spec-cardiologia', name: 'Cardiologia' },
    { id: 'spec-pediatria', name: 'Pediatria' },
    { id: 'spec-anestesiologia', name: 'Anestesiologia' },
  ];
  for (const s of specs) {
    await prisma.specialty.upsert({ where: { id: s.id }, update: {}, create: s });
  }
  await prisma.cbo.upsert({
    where: { id: 'cbo-medico-clinico' },
    update: {},
    create: {
      id: 'cbo-medico-clinico',
      name: 'Medico clinico',
      normalizedName: 'medico clinico',
      coCbo: '225125',
      cbo2002Code: '225125',
      availableForAssignment: true,
      code: '225125',
      cbo2002: '225125',
    },
  });
  const docTypes: { id: string; name: string; slug: string; scope: any; requiredByDefault: boolean }[] = [
    { id: 'doc-crm', name: 'Carteira do CRM', slug: 'crm', scope: 'PROFESSIONAL', requiredByDefault: true },
    { id: 'doc-cpf', name: 'CPF', slug: 'cpf', scope: 'PROFESSIONAL', requiredByDefault: true },
    { id: 'doc-contrato-social', name: 'Contrato social', slug: 'contrato-social', scope: 'ORGANIZATION', requiredByDefault: false },
  ];
  for (const d of docTypes) {
    await prisma.documentType.upsert({ where: { id: d.id }, update: {}, create: { ...d, active: true } });
  }

  // ------------------------------------------------------------ Profissionais
  const pros: { id: string; fullName: string; status: any; credentialStatus: any; spec: string }[] = [
    { id: 'pro-ana', fullName: 'Ana Carolina Souza', status: 'ACTIVE', credentialStatus: 'VALID', spec: 'spec-clinica-medica' },
    { id: 'pro-bruno', fullName: 'Bruno Lima', status: 'ACTIVE', credentialStatus: 'VALID', spec: 'spec-cardiologia' },
    { id: 'pro-carla', fullName: 'Carla Mendes', status: 'ACTIVE', credentialStatus: 'PENDING_VALIDATION', spec: 'spec-clinica-medica' },
    { id: 'pro-diego', fullName: 'Diego Ramos', status: 'INCOMPLETE', credentialStatus: 'MISSING_DATA', spec: 'spec-pediatria' },
  ];
  for (let i = 0; i < pros.length; i++) {
    const pr = pros[i];
    await prisma.healthProfessional.upsert({
      where: { id: pr.id },
      update: {},
      create: {
        id: pr.id,
        fullName: pr.fullName,
        whatsapp: `(85) 9${String(80000000 + i).padStart(8, '0')}`,
        professionalType: 'PHYSICIAN',
        council: 'CRM',
        gender: 'NOT_INFORMED',
        origin: 'MANUAL',
        status: pr.status,
        credentialStatus: pr.credentialStatus,
        mainSpecialtyId: pr.spec,
        primaryCboId: 'cbo-medico-clinico',
        metrics: { create: {} },
      },
    });
  }

  // ----------------------------------------------------------------- Contrato
  await prisma.contract.upsert({
    where: { id: 'contract-plantao-aurora' },
    update: {},
    create: {
      id: 'contract-plantao-aurora',
      code: 'CON-2026-0001',
      name: 'Plantões Clínica Aurora',
      type: 'RECURRING_SHIFT',
      status: 'ACTIVE',
      organizationId: 'organization-saude-nordeste',
      healthUnitId: 'health-unit-clinica-aurora',
      startsAt: new Date('2026-01-01T00:00:00Z'),
      requiredDoctors: 3,
      currency: 'BRL',
    },
  });

  // ------------------------------------------------------------------- Vagas
  const vacancies: { id: string; title: string; status: any; priority: any; spec: string; client: number; doctor: number; req: number }[] = [
    { id: 'vac-clinico-aurora', title: 'Plantão clínico - Clínica Aurora', status: 'OPEN', priority: 'URGENT', spec: 'spec-clinica-medica', client: 1800, doctor: 1200, req: 1 },
    { id: 'vac-cardio-upa', title: 'Cardiologia - UPA Leste', status: 'MATCHING', priority: 'HIGH', spec: 'spec-cardiologia', client: 2500, doctor: 1700, req: 1 },
    { id: 'vac-pediatria-vida', title: 'Pediatria - Clínica Vida Plena', status: 'OPEN', priority: 'NORMAL', spec: 'spec-pediatria', client: 2000, doctor: 1400, req: 1 },
  ];
  for (const v of vacancies) {
    await prisma.vacancy.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        code: `VAG-2026-${v.id.slice(-3)}`,
        title: v.title,
        status: v.status,
        priority: v.priority,
        organizationId: 'organization-saude-nordeste',
        healthUnitId: 'health-unit-clinica-aurora',
        contractId: 'contract-plantao-aurora',
        specialtyId: v.spec,
        startsAt: new Date('2026-07-15T11:00:00Z'),
        endsAt: new Date('2026-07-15T23:00:00Z'),
        requiredDoctors: v.req,
        clientAmount: v.client,
        doctorAmount: v.doctor,
        currency: 'BRL',
        workModel: 'ONSITE',
      },
    });
  }

  // -------------------------------------- Candidaturas / Alocações (idempotente)
  // IDs fixos + upsert: re-rodar o seed NUNCA apaga dados (preserva o que foi
  // criado em runtime via API/IA/WhatsApp). Sem nenhum deleteMany.
  const apps: { id: string; vacancyId: string; professionalId: string; status: any; matchScore: number }[] = [
    { id: 'app-ana-aurora', vacancyId: 'vac-clinico-aurora', professionalId: 'pro-ana', status: 'APPROVED', matchScore: 95 },
    { id: 'app-carla-aurora', vacancyId: 'vac-clinico-aurora', professionalId: 'pro-carla', status: 'IN_REVIEW', matchScore: 70 },
    { id: 'app-bruno-cardio', vacancyId: 'vac-cardio-upa', professionalId: 'pro-bruno', status: 'PENDING', matchScore: 88 },
  ];
  for (const a of apps) {
    await prisma.application.upsert({ where: { id: a.id }, update: {}, create: a });
  }
  await prisma.allocation.upsert({
    where: { id: 'alloc-ana-aurora' },
    update: {},
    create: {
      id: 'alloc-ana-aurora',
      vacancyId: 'vac-clinico-aurora',
      professionalId: 'pro-ana',
      status: 'CONFIRMED',
      startsAt: new Date('2026-07-15T11:00:00Z'),
      endsAt: new Date('2026-07-15T23:00:00Z'),
    },
  });
  await prisma.vacancy.update({ where: { id: 'vac-clinico-aurora' }, data: { filledDoctors: 1 } });

  // ---------------------------------------------- Conversas / mensagens / IA
  await prisma.conversation.upsert({
    where: { id: 'conv-ana-aurora' },
    update: {},
    create: {
      id: 'conv-ana-aurora',
      professionalId: 'pro-ana',
      vacancyId: 'vac-clinico-aurora',
      channel: 'WHATSAPP',
      status: 'AI_ACTIVE',
      aiEnabled: true,
      lastMessageAt: new Date(),
      messages: {
        create: [
          { direction: 'OUTBOUND', body: 'Olá! Temos um plantão na Clínica Aurora dia 15/07. Tem interesse?', sentByAi: true },
          { direction: 'INBOUND', body: 'Tenho sim, pode me passar os detalhes?' },
        ],
      },
    },
  });
  await prisma.conversation.upsert({
    where: { id: 'conv-bruno' },
    update: {},
    create: { id: 'conv-bruno', professionalId: 'pro-bruno', channel: 'WHATSAPP', status: 'WAITING_HUMAN', aiEnabled: false, lastMessageAt: new Date() },
  });
  await prisma.aiConversationRun.upsert({
    where: { id: 'run-ana-1' },
    update: {},
    create: { id: 'run-ana-1', conversationId: 'conv-ana-aurora', status: 'COMPLETED', model: 'gpt-4o-mini', outcome: 'Profissional respondeu com interesse', tokensUsed: 1450, finishedAt: new Date() },
  });

  // ------------------------------------------------------------ Integrações
  // Os provedores ativos (twilio/openwa) são garantidos em runtime pelo
  // MessagingService (ensureProviderRows); o seed não mexe no provedor padrão.
  const outLogs: any[] = [
    { id: 'log-seed-1', conversationId: 'conv-ana-aurora', provider: 'twilio', channel: 'WHATSAPP', to: '(85) 980000000', from: '+5585990000000', contentType: 'text', body: 'Mensagem enviada com sucesso', status: 'DELIVERED', externalMessageId: 'SM123', sentAt: new Date() },
    { id: 'log-seed-2', provider: 'twilio', channel: 'WHATSAPP', to: '(85) 981111111', body: 'Número inválido', status: 'FAILED', errorCode: '21211', errorMessage: 'invalid_number' },
  ];
  for (const l of outLogs) {
    await prisma.outboundMessageLog.upsert({ where: { id: l.id }, update: {}, create: l });
  }
  await prisma.webhookLog.upsert({
    where: { id: 'wh-seed-1' },
    update: {},
    create: { id: 'wh-seed-1', provider: 'twilio', channel: 'WHATSAPP', eventType: 'message.delivered', externalEventId: 'EV123', processed: true, processedAt: new Date() },
  });

  // -------------------------------------------------------------- Financeiro
  const due = (d: string) => new Date(d);
  const fins: any[] = [
    { id: 'fin-1', type: 'CLIENT_RECEIVABLE', direction: 'IN', status: 'PENDING_APPROVAL', amount: 1800, currency: 'BRL', dueDate: due('2026-07-31'), competenceDate: due('2026-07-01'), vacancyId: 'vac-clinico-aurora', organizationId: 'organization-saude-nordeste', contractId: 'contract-plantao-aurora', description: 'Plantão clínico - recebível cliente' },
    { id: 'fin-2', type: 'PROFESSIONAL_PAYABLE', direction: 'OUT', status: 'PENDING_APPROVAL', amount: 1200, currency: 'BRL', dueDate: due('2026-08-05'), competenceDate: due('2026-07-01'), vacancyId: 'vac-clinico-aurora', doctorId: 'pro-ana', description: 'Plantão clínico - pagável profissional' },
    { id: 'fin-3', type: 'CLIENT_RECEIVABLE', direction: 'IN', status: 'APPROVED', amount: 2500, currency: 'BRL', dueDate: due('2026-07-20'), organizationId: 'organization-saude-nordeste', description: 'Cardiologia - recebível aprovado' },
    { id: 'fin-4', type: 'PROFESSIONAL_PAYABLE', direction: 'OUT', status: 'PAID', amount: 1700, currency: 'BRL', dueDate: due('2026-06-10'), paidAt: due('2026-06-10'), doctorId: 'pro-bruno', description: 'Pagamento realizado' },
    { id: 'fin-5', type: 'CLIENT_RECEIVABLE', direction: 'IN', status: 'OVERDUE', amount: 900, currency: 'BRL', dueDate: due('2026-05-30'), organizationId: 'organization-saude-nordeste', description: 'Recebível vencido' },
    { id: 'fin-6', type: 'PLATFORM_FEE', direction: 'IN', status: 'CANCELLED', amount: 300, currency: 'BRL', description: 'Taxa cancelada' },
    { id: 'fin-7', type: 'CLIENT_RECEIVABLE', direction: 'IN', status: 'CONTESTED', amount: 600, currency: 'BRL', description: 'Recebível contestado' },
  ];
  for (const f of fins) {
    await prisma.financialEntry.upsert({ where: { id: f.id }, update: {}, create: f });
  }

  // Auditoria de exemplo
  const admin = await prisma.user.findUnique({ where: { email } });
  const audits: any[] = [
    { id: 'audit-1', actorUserId: admin?.id, action: 'contracts.create', entityType: 'Contract', entityId: 'contract-plantao-aurora', payload: { code: 'CON-2026-0001', status: 'ACTIVE' } },
    { id: 'audit-2', actorUserId: admin?.id, action: 'vacancies.create', entityType: 'Vacancy', entityId: 'vac-clinico-aurora', payload: { code: 'VAG-2026-ora' } },
    { id: 'audit-3', actorUserId: admin?.id, action: 'applications.update', entityType: 'Application', entityId: null },
  ];
  for (const a of audits) {
    await prisma.auditLog.upsert({ where: { id: a.id }, update: {}, create: a });
  }

  // eslint-disable-next-line no-console
  console.log(`Seed concluído. Admin: ${email} | ${vacancies.length} vagas, ${pros.length} profissionais.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
