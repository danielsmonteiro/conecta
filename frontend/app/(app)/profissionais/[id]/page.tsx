'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ErrorState, Info, Loading, PageHeader, Panel, StatusBadge, formatBRL } from '@/components/ui';
import { useApi } from '@/lib/useApi';

interface Profile {
  id: string;
  fullName: string;
  professionalType: string;
  council: string | null;
  crmNumber: string | null;
  crmState: string | null;
  whatsapp: string;
  email: string | null;
  city: string | null;
  state: string | null;
  status: string;
  credentialStatus: string;
  noShowCount: number;
  mainSpecialty?: { name: string } | null;
  primaryCbo?: { name: string } | null;
  metrics?: { applicationsCount: number; allocationsCount: number; completedAllocationsCount: number; cancellationsCount: number } | null;
}
interface Financial { currency: string; totalEarnings: number; allocationsConsidered: number; }

export default function ProfissionalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: p, loading, error } = useApi<Profile>(`/health-professionals/${id}/profile`);
  const fin = useApi<Financial>(`/health-professionals/${id}/financial`);

  if (error) return <ErrorState message={error} />;
  if (loading || !p) return <Loading />;

  return (
    <div>
      <PageHeader title={p.fullName} subtitle={`${p.professionalType}${p.mainSpecialty ? ` · ${p.mainSpecialty.name}` : ''}`} action={<div className="flex items-center gap-3"><Link href={`/profissionais/${id}/editar`} className="btn-ghost">Editar</Link><StatusBadge status={p.status} /></div>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Dados do profissional">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Info label="WhatsApp" value={p.whatsapp} />
              <Info label="E-mail" value={p.email} />
              <Info label="Conselho" value={p.council ? `${p.council} ${p.crmNumber ?? ''}${p.crmState ? '/' + p.crmState : ''}` : '—'} />
              <Info label="Especialidade" value={p.mainSpecialty?.name} />
              <Info label="CBO principal" value={p.primaryCbo?.name} />
              <Info label="Local" value={[p.city, p.state].filter(Boolean).join('/') || '—'} />
              <Info label="Credenciais" value={<StatusBadge status={p.credentialStatus} />} />
              <Info label="Faltas (no-show)" value={p.noShowCount} />
            </dl>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Métricas">
            <dl className="space-y-2 text-sm">
              <Info label="Candidaturas" value={p.metrics?.applicationsCount ?? 0} />
              <Info label="Alocações" value={p.metrics?.allocationsCount ?? 0} />
              <Info label="Concluídas" value={p.metrics?.completedAllocationsCount ?? 0} />
              <Info label="Cancelamentos" value={p.metrics?.cancellationsCount ?? 0} />
            </dl>
          </Panel>
          <Panel title="Financeiro">
            <Info label="Ganhos (alocações)" value={fin.data ? formatBRL(fin.data.totalEarnings, fin.data.currency) : '—'} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
