'use client';

import Link from 'next/link';
import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatusBadge } from '@/components/ui';
import { Paged, useApi } from '@/lib/useApi';

interface Conversation {
  id: string;
  channel: string;
  status: string;
  aiEnabled: boolean;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  professional?: { fullName: string } | null;
  _count?: { messages: number };
}

const cols: Column<Conversation>[] = [
  { header: 'Profissional', render: (r) => <Link href={`/conversas/${r.id}`} className="font-medium text-hm-primary hover:underline">{r.professional?.fullName ?? '—'}</Link> },
  { header: 'Canal', render: (r) => <span className="text-hm-text-muted">{r.channel}</span> },
  { header: 'IA', render: (r) => (r.aiEnabled ? <span className="text-hm-info">ativa</span> : <span className="text-hm-text-subtle">—</span>) },
  { header: 'Última mensagem', render: (r) => <span className="text-hm-text-muted">{r.lastMessagePreview ?? '—'}</span> },
  { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
];

export default function ConversasPage() {
  const { data, loading, error } = useApi<Paged<Conversation>>('/conversations?limit=50');
  return (
    <div>
      <PageHeader title="Conversas" subtitle="Atendimentos e conversas com profissionais." />
      <DataTable columns={cols} rows={data?.items ?? null} loading={loading} error={error} empty="Nenhuma conversa." />
    </div>
  );
}
