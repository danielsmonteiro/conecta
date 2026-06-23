'use client';

import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatusBadge } from '@/components/ui';
import { useApi } from '@/lib/useApi';

interface Entry {
  allocationId: string;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  professional: { fullName: string } | null;
  vacancy: { title: string } | null;
}
interface Schedule {
  entries: Entry[];
  total: number;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

const cols: Column<Entry>[] = [
  { header: 'Início', render: (r) => <span className="font-medium text-hm-text">{fmt(r.startsAt)}</span> },
  { header: 'Fim', render: (r) => <span className="text-hm-text-muted">{fmt(r.endsAt)}</span> },
  { header: 'Profissional', render: (r) => <span className="text-hm-text-muted">{r.professional?.fullName ?? '—'}</span> },
  { header: 'Vaga', render: (r) => <span className="text-hm-text-muted">{r.vacancy?.title ?? '—'}</span> },
  { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
];

export default function EscalaPage() {
  const { data, loading, error } = useApi<Schedule>('/allocations/schedule');
  return (
    <div>
      <PageHeader title="Escala" subtitle="Escala operacional das alocações ativas." />
      <DataTable columns={cols} rows={data?.entries ?? null} loading={loading} error={error} empty="Nenhuma escala montada." />
    </div>
  );
}
