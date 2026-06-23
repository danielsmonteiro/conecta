'use client';

import { Column, DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/ui';
import { Paged, useApi } from '@/lib/useApi';

interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  actorUser?: { fullName: string; email: string } | null;
}

const cols: Column<AuditLog>[] = [
  { header: 'Ação', render: (r) => <span className="font-mono text-xs font-medium text-hm-primary">{r.action}</span> },
  { header: 'Entidade', render: (r) => <span className="text-hm-text-muted">{r.entityType ?? '—'}</span> },
  { header: 'ID', render: (r) => <span className="font-mono text-xs text-hm-text-subtle">{r.entityId ?? '—'}</span> },
  { header: 'Ator', render: (r) => <span className="text-hm-text-muted">{r.actorUser?.fullName ?? 'Sistema'}</span> },
  { header: 'Data', render: (r) => <span className="text-hm-text-muted">{new Date(r.createdAt).toLocaleString('pt-BR')}</span> },
];

export default function AuditoriaPage() {
  const { data, loading, error } = useApi<Paged<AuditLog>>('/audit-logs?limit=50');
  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Histórico de ações e mutações no sistema." />
      <DataTable columns={cols} rows={data?.items ?? null} loading={loading} error={error} empty="Nenhum registro de auditoria." />
    </div>
  );
}
