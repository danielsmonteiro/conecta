'use client';

import { useState } from 'react';
import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { Paged, useApi } from '@/lib/useApi';

interface Allocation {
  id: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  professional?: { fullName: string } | null;
  vacancy?: { title: string } | null;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

function ActionBtn({ label, tone, disabled, onClick }: { label: string; tone: 'success' | 'danger' | 'primary'; disabled: boolean; onClick: () => void }) {
  const cls = tone === 'success' ? 'bg-hm-success-soft text-hm-success' : tone === 'danger' ? 'bg-hm-danger-soft text-hm-danger' : 'bg-hm-primary-soft text-hm-primary';
  return <button disabled={disabled} onClick={onClick} className={`rounded-hm-sm ${cls} px-2.5 py-1 text-xs font-medium hover:opacity-80`}>{label}</button>;
}

export default function AlocacoesPage() {
  const { data, loading, error, reload } = useApi<Paged<Allocation>>('/allocations?limit=50&sortBy=startsAt&sortOrder=asc');
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      await api.patch(`/allocations/${id}/status`, { status });
      reload();
    } finally {
      setBusy(null);
    }
  }

  const cols: Column<Allocation>[] = [
    { header: 'Profissional', render: (r) => <span className="font-medium text-hm-text">{r.professional?.fullName ?? '—'}</span> },
    { header: 'Vaga', render: (r) => <span className="text-hm-text-muted">{r.vacancy?.title ?? '—'}</span> },
    { header: 'Início', render: (r) => <span className="text-hm-text-muted">{fmt(r.startsAt)}</span> },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Ações',
      className: 'text-right',
      render: (r) => {
        const b = busy === r.id;
        return (
          <div className="flex justify-end gap-1.5">
            {r.status === 'PENDING' && <ActionBtn label="Confirmar" tone="primary" disabled={b} onClick={() => setStatus(r.id, 'CONFIRMED')} />}
            {['CONFIRMED', 'IN_PROGRESS'].includes(r.status) && <ActionBtn label="Concluir" tone="success" disabled={b} onClick={() => setStatus(r.id, 'COMPLETED')} />}
            {['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(r.status) && <ActionBtn label="Cancelar" tone="danger" disabled={b} onClick={() => setStatus(r.id, 'CANCELLED')} />}
            {['COMPLETED', 'CANCELLED'].includes(r.status) && <span className="text-xs text-hm-text-subtle">—</span>}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Alocações" subtitle="Profissionais alocados em vagas." />
      <DataTable columns={cols} rows={data?.items ?? null} loading={loading} error={error} empty="Nenhuma alocação." />
    </div>
  );
}
