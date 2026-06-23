'use client';

import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatusBadge } from '@/components/ui';
import { Paged, useApi } from '@/lib/useApi';

interface Score {
  doctorId: string;
  doctor: { fullName: string } | null;
  vacancyId: string;
  score: string;
  category: string;
  eligible: boolean;
  positiveReasons: string[];
}

const cols: Column<Score>[] = [
  { header: 'Profissional', render: (r) => <span className="font-medium text-hm-text">{r.doctor?.fullName ?? '—'}</span> },
  { header: 'Compatibilidade', render: (r) => <span className="text-xs text-hm-text-subtle">{(r.positiveReasons ?? []).slice(0, 1).join('') || '—'}</span> },
  { header: 'Categoria', render: (r) => <StatusBadge status={r.category} /> },
  { header: 'Elegível', render: (r) => (r.eligible ? <span className="text-hm-success">sim</span> : <span className="text-hm-warning">não</span>) },
  {
    header: 'Score',
    render: (r) => (
      <span className="rounded-full bg-hm-primary-soft px-2.5 py-0.5 text-sm font-semibold text-hm-primary">{r.score}</span>
    ),
  },
];

export default function MatchingPage() {
  const { data, loading, error } = useApi<Paged<Score>>('/matching/scores?page=1&limit=20');
  return (
    <div>
      <PageHeader title="Matching" subtitle="Motor de compatibilidade profissional × vaga." />
      <DataTable columns={cols} rows={data?.items ?? null} loading={loading} error={error} empty="Sem scores de matching." />
    </div>
  );
}
