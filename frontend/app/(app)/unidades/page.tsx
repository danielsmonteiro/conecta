'use client';

import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatusBadge } from '@/components/ui';
import { Paged, useApi } from '@/lib/useApi';

interface HealthUnit {
  id: string;
  name: string;
  type: string;
  status: string;
  organization?: { name: string } | null;
}

const cols: Column<HealthUnit>[] = [
  { header: 'Nome', render: (r) => <span className="font-medium text-hm-text">{r.name}</span> },
  { header: 'Tipo', render: (r) => <span className="text-hm-text-muted">{r.type}</span> },
  { header: 'Organização', render: (r) => <span className="text-hm-text-muted">{r.organization?.name ?? '—'}</span> },
  { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
];

export default function UnidadesPage() {
  const { data, loading, error } = useApi<Paged<HealthUnit>>('/health-units?limit=50');
  return (
    <div>
      <PageHeader title="Unidades" subtitle="Unidades de saúde cadastradas." />
      <DataTable columns={cols} rows={data?.items ?? null} loading={loading} error={error} empty="Nenhuma unidade." />
    </div>
  );
}
