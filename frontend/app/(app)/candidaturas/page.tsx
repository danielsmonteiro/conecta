'use client';

import { useState } from 'react';
import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { Paged, useApi } from '@/lib/useApi';

interface Application {
  id: string;
  status: string;
  origin: string;
  matchScore: number | null;
  professional?: { fullName: string } | null;
  vacancy?: { title: string } | null;
}

const ORIGIN_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  AI: 'IA (abordagem)',
  SELF_APPLICATION: 'WhatsApp (busca espontânea)',
  HOTSITE: 'WhatsApp + hotsite',
  MATCHING: 'Matching',
  IMPORT: 'Importação',
};

export default function CandidaturasPage() {
  const { data, loading, error, reload } = useApi<Paged<Application>>('/applications?limit=50');
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      await api.patch(`/applications/${id}/status`, { status });
      reload();
    } finally {
      setBusy(null);
    }
  }

  const cols: Column<Application>[] = [
    { header: 'Profissional', render: (r) => <span className="font-medium text-hm-text">{r.professional?.fullName ?? '—'}</span> },
    { header: 'Vaga', render: (r) => <span className="text-hm-text-muted">{r.vacancy?.title ?? '—'}</span> },
    { header: 'Origem', render: (r) => <span className="text-hm-text-muted">{ORIGIN_LABEL[r.origin] ?? r.origin}</span> },
    { header: 'Score', render: (r) => <span className="text-hm-text-muted">{r.matchScore ?? '—'}</span> },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Ações',
      className: 'text-right',
      render: (r) =>
        ['PENDING', 'IN_REVIEW'].includes(r.status) ? (
          <div className="flex justify-end gap-1.5">
            <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'APPROVED')} className="rounded-hm-sm bg-hm-success-soft px-2.5 py-1 text-xs font-medium text-hm-success hover:opacity-80">Aprovar</button>
            <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'REJECTED')} className="rounded-hm-sm bg-hm-danger-soft px-2.5 py-1 text-xs font-medium text-hm-danger hover:opacity-80">Rejeitar</button>
          </div>
        ) : (
          <span className="text-xs text-hm-text-subtle">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Candidaturas" subtitle="Candidaturas dos profissionais às vagas." />
      <DataTable columns={cols} rows={data?.items ?? null} loading={loading} error={error} empty="Nenhuma candidatura." />
    </div>
  );
}
