'use client';

import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatCard, formatBRL } from '@/components/ui';
import { Paged, useApi } from '@/lib/useApi';

interface Summary {
  totalReceivable: string;
  totalPayable: string;
  overdueReceivable: string;
  estimatedMargin: string;
  entriesCount: number;
}
interface Entry {
  id: string;
  type: string;
  direction: string;
  status: string;
  amount: string;
  currency: string;
  dueDate: string | null;
  description: string | null;
}

const cols: Column<Entry>[] = [
  { header: 'Descrição', render: (r) => <span className="font-medium text-hm-text">{r.description ?? r.type}</span> },
  { header: 'Tipo', render: (r) => <span className="text-hm-text-muted">{r.type}</span> },
  { header: 'Direção', render: (r) => <span className={r.direction === 'IN' ? 'text-hm-success' : 'text-hm-danger'}>{r.direction === 'IN' ? 'Entrada' : 'Saída'}</span> },
  { header: 'Vencimento', render: (r) => <span className="text-hm-text-muted">{r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : '—'}</span> },
  { header: 'Status', render: (r) => <span className="text-hm-text-muted">{r.status}</span> },
  { header: 'Valor', className: 'text-right', render: (r) => <span className="font-medium text-hm-text">{formatBRL(Number(r.amount), r.currency)}</span> },
];

export default function FinanceiroPage() {
  const summary = useApi<Summary>('/financial/summary');
  const entries = useApi<Paged<Entry>>('/financial/entries?limit=20&sortBy=dueDate&sortOrder=asc');
  const s = summary.data;
  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Recebíveis, pagáveis e margem da operação." />
      {s && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="A receber" value={formatBRL(Number(s.totalReceivable))} />
          <StatCard label="A pagar" value={formatBRL(Number(s.totalPayable))} />
          <StatCard label="Vencidos (receber)" value={formatBRL(Number(s.overdueReceivable))} />
          <StatCard label="Margem estimada" value={formatBRL(Number(s.estimatedMargin))} hint={`${s.entriesCount} lançamentos`} />
        </div>
      )}
      <DataTable columns={cols} rows={entries.data?.items ?? null} loading={entries.loading} error={entries.error} empty="Nenhum lançamento." />
    </div>
  );
}
