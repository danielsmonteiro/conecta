'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ErrorState, Info, Loading, PageHeader, Panel, StatusBadge, formatBRL } from '@/components/ui';
import { useApi } from '@/lib/useApi';

interface Profile {
  id: string;
  code: string | null;
  name: string;
  type: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  requiredDoctors: number;
  currency: string;
  organization?: { name: string } | null;
  healthUnit?: { name: string } | null;
  _count?: { vacancies: number };
}
interface Financial { currency: string; vacancyCount: number; margin: number; client: number; doctor: number; }

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

export default function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: c, loading, error } = useApi<Profile>(`/contracts/${id}/profile`);
  const fin = useApi<Financial>(`/contracts/${id}/financial`);

  if (error) return <ErrorState message={error} />;
  if (loading || !c) return <Loading />;

  return (
    <div>
      <PageHeader title={c.name} subtitle={`${c.code ?? ''} · ${c.healthUnit?.name ?? ''}`} action={<div className="flex items-center gap-3"><Link href={`/contratos/${id}/editar`} className="btn-ghost">Editar</Link><StatusBadge status={c.status} /></div>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Dados do contrato">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Tipo" value={c.type} />
              <Info label="Organização" value={c.organization?.name} />
              <Info label="Unidade" value={c.healthUnit?.name} />
              <Info label="Profissionais" value={c.requiredDoctors} />
              <Info label="Início" value={fmt(c.startsAt)} />
              <Info label="Fim" value={fmt(c.endsAt)} />
              <Info label="Vagas geradas" value={c._count?.vacancies ?? 0} />
            </dl>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Financeiro">
            <dl className="space-y-2 text-sm">
              <Info label="Receita" value={fin.data ? formatBRL(fin.data.client, fin.data.currency) : '—'} />
              <Info label="Custo" value={fin.data ? formatBRL(fin.data.doctor, fin.data.currency) : '—'} />
              <Info label="Margem" value={fin.data ? formatBRL(fin.data.margin, fin.data.currency) : '—'} />
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
