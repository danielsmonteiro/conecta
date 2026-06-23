'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LinkButton, Loading, Panel, PageHeader, StatCard, ErrorState, StatusBadge, formatBRL } from '@/components/ui';
import { api } from '@/lib/api';
import { Paged, useApi } from '@/lib/useApi';

// Contrato plano da produção (61 contadores). Tipamos os usados na tela.
interface Summary {
  openVacancies: number;
  urgentVacancies: number;
  pendingApplications: number;
  underReviewApplications: number;
  eligibleApplications: number;
  confirmedAllocations: number;
  inProgressAllocations: number;
  pendingConfirmationAllocations: number;
  estimatedMargin: string;
  calculatedMatches: number;
  applicationsFromMatching: number;
  openConversations: number;
  aiEnabledConversations: number;
  waitingHumanConversations: number;
  failedOutboundMessages: number;
  organizationsCount: number;
  publicAgenciesCount: number;
  registeredHealthUnits: number;
  activeContracts: number;
  registeredDoctors: number;
  operationalAlerts: number;
  overdueFinancialEntries: number;
  [k: string]: number | string;
}

export default function DashboardPage() {
  const [d, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Summary>('/dashboard/summary').then(setData).catch((e) => setError(e.message));
  }, []);

  const aiCoverage = d && d.openConversations ? Math.round((d.aiEnabledConversations / d.openConversations) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão inteligente da operação, vagas e profissionais."
        action={<LinkButton href="/vagas/nova">+ Nova vaga</LinkButton>}
      />

      {error && <ErrorState message={error} />}
      {!d && !error && <Loading />}

      {d && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Vagas abertas" value={d.openVacancies} hint={`${d.urgentVacancies} urgentes`} />
            <StatCard
              label="Candidaturas em andamento"
              value={d.pendingApplications + d.underReviewApplications}
              hint={`${d.eligibleApplications} aptas · ${d.underReviewApplications} em análise`}
            />
            <StatCard
              label="Alocações ativas"
              value={d.confirmedAllocations + d.inProgressAllocations}
              hint={`${d.pendingConfirmationAllocations} pendentes · ${d.confirmedAllocations} confirmadas`}
            />
            <StatCard label="Margem estimada" value={formatBRL(Number(d.estimatedMargin))} hint="previsão mensal" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Pipeline operacional">
              <div className="flex items-center justify-between gap-2 text-center">
                <PipeStep value={d.calculatedMatches} label="Matchings I.A." tone="info" />
                <Arrow />
                <PipeStep value={d.applicationsFromMatching} label="Candidaturas" tone="muted" />
                <Arrow />
                <PipeStep value={d.confirmedAllocations} label="Alocações" tone="success" />
              </div>
            </Panel>

            <Panel title="Atendimento & Conversas">
              <Row label="Conversas abertas" value={d.openConversations} />
              <Row label="Conversas com IA ativa" value={d.aiEnabledConversations} />
              <Row label="Aguardando humano" value={d.waitingHumanConversations} warn />
              <Row label="Falhas de envio" value={d.failedOutboundMessages} warn={d.failedOutboundMessages > 0} />
              <p className="mt-3 text-xs text-hm-text-subtle">IA ativa em {aiCoverage}% das conversas abertas</p>
            </Panel>

            <Panel title="Cobertura operacional">
              <div className="grid grid-cols-2 gap-4">
                <Mini value={d.organizationsCount} label="Organizações" />
                <Mini value={d.publicAgenciesCount} label="Órgãos públicos" />
                <Mini value={d.registeredHealthUnits} label="Unidades" />
                <Mini value={d.activeContracts} label="Contratos ativos" />
              </div>
              <p className="mt-4 flex items-center justify-between border-t border-hm-border-soft pt-3 text-sm">
                <span className="text-hm-text-muted">Banco de reserva</span>
                <span className="font-semibold text-hm-text">{d.registeredDoctors} profissionais</span>
              </p>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <CriticalPending d={d} />
            <div className="lg:col-span-2">
              <RecentActivity />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CriticalPending({ d }: { d: Summary }) {
  const alerts: { label: string; tone: 'warn' | 'danger' }[] = [];
  if (d.urgentVacancies > 0) alerts.push({ label: `${d.urgentVacancies} vaga(s) urgente(s) em aberto`, tone: 'danger' });
  if (d.underReviewApplications > 0) alerts.push({ label: `${d.underReviewApplications} candidatura(s) em análise`, tone: 'warn' });
  if (d.waitingHumanConversations > 0) alerts.push({ label: `${d.waitingHumanConversations} conversa(s) aguardando humano`, tone: 'warn' });
  if (d.failedOutboundMessages > 0) alerts.push({ label: `${d.failedOutboundMessages} falha(s) de envio`, tone: 'danger' });
  if (d.pendingConfirmationAllocations > 0) alerts.push({ label: `${d.pendingConfirmationAllocations} alocação(ões) pendente(s)`, tone: 'warn' });
  if (d.overdueFinancialEntries > 0) alerts.push({ label: `${d.overdueFinancialEntries} lançamento(s) financeiro(s) vencido(s)`, tone: 'danger' });

  return (
    <Panel title={`Pendências críticas${alerts.length ? ` · ${alerts.length} itens` : ''}`}>
      {alerts.length === 0 ? (
        <p className="text-sm text-hm-text-subtle">Nenhuma pendência crítica. 🎉</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${a.tone === 'danger' ? 'bg-hm-danger' : 'bg-hm-warning'}`} />
              <span className="text-hm-text">{a.label}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const TABS = [
  { key: 'vagas', label: 'Vagas', path: '/vacancies?limit=5', href: '/vagas', render: (i: any) => ({ title: i.title, sub: i.status }) },
  { key: 'candidaturas', label: 'Candidaturas', path: '/applications?limit=5', href: '/candidaturas', render: (i: any) => ({ title: i.professional?.fullName ?? i.doctor?.fullName ?? '—', sub: i.status }) },
  { key: 'alocacoes', label: 'Alocações', path: '/allocations?limit=5', href: '/alocacoes', render: (i: any) => ({ title: i.professional?.fullName ?? i.doctor?.fullName ?? '—', sub: i.status }) },
  { key: 'conversas', label: 'Conversas', path: '/conversations?limit=5', href: '/conversas', render: (i: any) => ({ title: i.professional?.fullName ?? i.doctor?.fullName ?? '—', sub: i.status }) },
];

function RecentActivity() {
  const [tab, setTab] = useState(0);
  const active = TABS[tab];
  const { data, loading } = useApi<Paged<any>>(active.path);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-hm-text">Atividade recente</h2>
        <Link href={active.href} className="text-xs text-hm-primary hover:underline">ver tudo →</Link>
      </div>
      <div className="mb-3 flex gap-1">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            onClick={() => setTab(i)}
            className={`rounded-hm-sm px-3 py-1 text-xs font-medium ${i === tab ? 'bg-hm-primary-soft text-hm-primary' : 'text-hm-text-muted hover:bg-hm-surface-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="py-4 text-center text-sm text-hm-text-subtle">Carregando…</p>
      ) : (data?.items?.length ?? 0) === 0 ? (
        <p className="py-4 text-center text-sm text-hm-text-subtle">Nada recente.</p>
      ) : (
        <ul className="divide-y divide-hm-border-soft">
          {data!.items.map((i, idx) => {
            const r = active.render(i);
            return (
              <li key={idx} className="flex items-center justify-between py-2 text-sm">
                <span className="text-hm-text">{r.title}</span>
                <StatusBadge status={r.sub} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PipeStep({ value, label, tone }: { value: number; label: string; tone: 'info' | 'muted' | 'success' }) {
  const bg = tone === 'info' ? 'bg-hm-info-soft text-hm-info' : tone === 'success' ? 'bg-hm-success-soft text-hm-success' : 'bg-hm-surface-muted text-hm-text';
  return (
    <div className={`flex-1 rounded-hm-md ${bg} py-3`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}
function Arrow() {
  return <span className="text-hm-text-subtle">→</span>;
}
function Row({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-hm-text-muted">{label}</span>
      <span className={`font-semibold ${warn ? 'text-hm-warning' : 'text-hm-text'}`}>{value}</span>
    </div>
  );
}
function Mini({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-hm-text">{value}</p>
      <p className="text-xs text-hm-text-subtle">{label}</p>
    </div>
  );
}
