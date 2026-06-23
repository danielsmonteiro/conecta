'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ErrorState, Info, Loading, PageHeader, Panel, StatusBadge, formatBRL } from '@/components/ui';
import { useApi } from '@/lib/useApi';

interface Profile {
  id: string;
  name: string;
  legalName: string | null;
  documentNumber: string | null;
  type: string;
  status: string;
  email: string | null;
  phone: string | null;
  mainContactName: string | null;
  _count?: { publicAgencies: number; healthUnits: number; contracts: number; vacancies: number };
}
interface Financial { currency: string; vacancyCount: number; margin: number; client: number; doctor: number; }

export default function OrganizacaoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: o, loading, error } = useApi<Profile>(`/organizations/${id}/profile`);
  const fin = useApi<Financial>(`/organizations/${id}/financial`);

  if (error) return <ErrorState message={error} />;
  if (loading || !o) return <Loading />;

  return (
    <div>
      <PageHeader title={o.name} subtitle={o.legalName ?? o.type} action={<div className="flex items-center gap-3"><Link href={`/organizacoes/${id}/editar`} className="btn-ghost">Editar</Link><StatusBadge status={o.status} /></div>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Dados da organização">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Tipo" value={o.type} />
              <Info label="Documento" value={o.documentNumber} />
              <Info label="E-mail" value={o.email} />
              <Info label="Telefone" value={o.phone} />
              <Info label="Contato" value={o.mainContactName} />
            </dl>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Cobertura">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Órgãos públicos" value={o._count?.publicAgencies ?? 0} />
              <Info label="Unidades" value={o._count?.healthUnits ?? 0} />
              <Info label="Contratos" value={o._count?.contracts ?? 0} />
              <Info label="Vagas" value={o._count?.vacancies ?? 0} />
            </dl>
          </Panel>
          <Panel title="Financeiro">
            <Info label="Margem estimada" value={fin.data ? formatBRL(fin.data.margin, fin.data.currency) : '—'} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
