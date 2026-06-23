'use client';

import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatusBadge } from '@/components/ui';
import { Paged, useApi } from '@/lib/useApi';

interface PublicAgency {
  id: string;
  name: string;
  acronym: string | null;
  type: string;
  sphere: string;
  state: string | null;
  city: string | null;
  status: string;
  organization?: { name: string } | null;
}

const cols: Column<PublicAgency>[] = [
  { header: 'Nome', render: (r) => <span className="font-medium text-hm-text">{r.name}{r.acronym ? ` (${r.acronym})` : ''}</span> },
  { header: 'Tipo', render: (r) => <span className="text-hm-text-muted">{r.type}</span> },
  { header: 'Esfera', render: (r) => <span className="text-hm-text-muted">{r.sphere}</span> },
  { header: 'Local', render: (r) => <span className="text-hm-text-muted">{[r.city, r.state].filter(Boolean).join('/') || '—'}</span> },
  { header: 'Organização', render: (r) => <span className="text-hm-text-muted">{r.organization?.name ?? '—'}</span> },
  { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
];

export default function OrgaosPublicosPage() {
  const { data, loading, error } = useApi<Paged<PublicAgency>>('/public-agencies?limit=50');
  return (
    <div>
      <PageHeader title="Órgãos Públicos" subtitle="Prefeituras e órgãos governamentais." />
      <DataTable columns={cols} rows={data?.items ?? null} loading={loading} error={error} empty="Nenhum órgão público." />
    </div>
  );
}
