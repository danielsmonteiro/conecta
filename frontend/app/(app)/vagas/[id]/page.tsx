'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorState, Loading, PageHeader, Panel, StatusBadge, formatBRL } from '@/components/ui';
import { api } from '@/lib/api';

interface Profile {
  id: string;
  code: string | null;
  title: string;
  status: string;
  priority: string;
  startsAt: string;
  endsAt: string;
  requiredDoctors: number;
  filledDoctors: number;
  healthUnit?: { name: string };
  organization?: { name: string };
  specialty?: { name: string } | null;
}
interface MatchScore {
  doctorId: string;
  doctor: { fullName: string } | null;
  score: string;
  category: 'LOW' | 'MEDIUM' | 'HIGH';
  eligible: boolean;
  operationalConflict: string | null;
  positiveReasons: string[];
  negativeReasons: string[];
  ineligibilityReasons: string[];
}
interface Financial {
  currency: string;
  total: { client: number; doctor: number; margin: number };
}
interface OutreachState {
  status: 'sending' | 'ok' | 'err';
  conversationId?: string;
  openerSent?: boolean;
  message?: string;
}

export default function VagaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [financial, setFinancial] = useState<Financial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outreach, setOutreach] = useState<Record<string, OutreachState>>({});

  async function abordar(doctorId: string) {
    setOutreach((o) => ({ ...o, [doctorId]: { status: 'sending' } }));
    try {
      const conv = await api.post<{ id: string; openerSent?: boolean }>('/conversations/outreach', {
        vacancyId: id,
        professionalId: doctorId,
      });
      setOutreach((o) => ({ ...o, [doctorId]: { status: 'ok', conversationId: conv.id, openerSent: conv.openerSent } }));
    } catch (e) {
      setOutreach((o) => ({ ...o, [doctorId]: { status: 'err', message: (e as Error).message } }));
    }
  }

  useEffect(() => {
    api.get<Profile>(`/vacancies/${id}/profile`).then(setProfile).catch((e) => setError(e.message));
    api.get<MatchScore[]>(`/vacancies/${id}/matching?limit=5`).then(setScores).catch(() => {});
    api.get<Financial>(`/vacancies/${id}/financial`).then(setFinancial).catch(() => {});
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!profile) return <Loading />;

  return (
    <div>
      <PageHeader
        title={profile.title}
        subtitle={`${profile.code ?? ''} · ${profile.healthUnit?.name ?? ''}`}
        action={
          <div className="flex items-center gap-3">
            <Link href={`/vagas/${id}/editar`} className="btn-ghost">Editar</Link>
            <StatusBadge status={profile.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Resumo">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Organização" value={profile.organization?.name ?? '—'} />
              <Info label="Especialidade" value={profile.specialty?.name ?? 'Não definida'} />
              <Info label="Prioridade" value={profile.priority} />
              <Info label="Vagas" value={`${profile.filledDoctors}/${profile.requiredDoctors} preenchidas`} />
              <Info label="Início" value={new Date(profile.startsAt).toLocaleString('pt-BR')} />
              <Info label="Fim" value={new Date(profile.endsAt).toLocaleString('pt-BR')} />
            </dl>
          </Panel>

          <Panel title="Matching I.A.">
            {scores.length === 0 ? (
              <p className="text-sm text-hm-text-subtle">Sem candidatos pontuados.</p>
            ) : (
              <ul className="space-y-2">
                {scores.map((s) => {
                  const o = outreach[s.doctorId];
                  return (
                  <li key={s.doctorId} className="flex items-center justify-between rounded-hm-sm border border-hm-border-soft px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-hm-text">{s.doctor?.fullName ?? '—'}</p>
                      <p className="text-xs text-hm-text-subtle">
                        {(s.positiveReasons ?? []).slice(0, 2).join(' · ') || s.category}
                      </p>
                      {o?.status === 'ok' && (
                        <p className="mt-1 text-xs text-hm-success">
                          Abordagem iniciada{o.openerSent ? ' · convite enviado' : ''} ·{' '}
                          <Link href={`/conversas/${o.conversationId}`} className="underline">ver conversa</Link>
                        </p>
                      )}
                      {o?.status === 'err' && <p className="mt-1 text-xs text-hm-warning">Falha: {o.message}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!s.eligible && <span className="text-xs text-hm-warning">inelegível</span>}
                      <span className="rounded-full bg-hm-primary-soft px-2.5 py-0.5 text-sm font-semibold text-hm-primary">
                        {s.score}
                      </span>
                      <button
                        type="button"
                        onClick={() => abordar(s.doctorId)}
                        disabled={o?.status === 'sending' || o?.status === 'ok'}
                        className="btn-ghost text-xs disabled:opacity-50"
                      >
                        {o?.status === 'sending' ? 'Abordando…' : o?.status === 'ok' ? 'Abordado' : 'Abordar'}
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Financeiro">
            {financial ? (
              <dl className="space-y-2 text-sm">
                <Info label="Receita (cliente)" value={formatBRL(financial.total.client, financial.currency)} />
                <Info label="Custo (profissional)" value={formatBRL(financial.total.doctor, financial.currency)} />
                <div className="border-t border-hm-border-soft pt-2">
                  <Info label="Margem" value={formatBRL(financial.total.margin, financial.currency)} />
                </div>
              </dl>
            ) : (
              <p className="text-sm text-hm-text-subtle">—</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-hm-text-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium text-hm-text">{value}</dd>
    </div>
  );
}
