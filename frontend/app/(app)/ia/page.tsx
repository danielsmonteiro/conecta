'use client';

import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, StatCard } from '@/components/ui';
import { Paged, useApi } from '@/lib/useApi';

interface AiStatus {
  enabled: boolean;
  dryRun: boolean;
  autoReplyEnabled: boolean;
  model: string;
  reasoningEffort: string;
  hasOpenAiKey: boolean;
  maxContextMessages: number;
  requireHumanForCriticalActions: boolean;
  provider: string;
  isConfigured: boolean;
}
interface Run {
  id: string;
  model: string;
  status: string;
  tokensUsed: number;
  outcome: string | null;
  startedAt: string;
}

const cols: Column<Run>[] = [
  { header: 'Modelo', render: (r) => <span className="font-medium text-hm-text">{r.model}</span> },
  { header: 'Status', render: (r) => <span className="text-hm-text-muted">{r.status}</span> },
  { header: 'Tokens', render: (r) => <span className="text-hm-text-muted">{r.tokensUsed}</span> },
  { header: 'Resultado', render: (r) => <span className="text-hm-text-muted">{r.outcome ?? '—'}</span> },
  { header: 'Início', render: (r) => <span className="text-hm-text-muted">{new Date(r.startedAt).toLocaleString('pt-BR')}</span> },
];

export default function IaPage() {
  const status = useApi<AiStatus>('/ai/status');
  const runs = useApi<Paged<Run>>('/ai/conversation-runs?page=1&limit=20');
  const s = status.data;
  return (
    <div>
      <PageHeader title="Inteligência Artificial" subtitle="Automação de atendimento e execuções da IA." />
      {s && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Status" value={s.enabled ? 'Ativa' : 'Inativa'} hint={s.isConfigured ? 'configurada' : 'não configurada'} />
          <StatCard label="Modelo" value={s.model} hint={`esforço: ${s.reasoningEffort}`} />
          <StatCard label="Resposta automática" value={s.autoReplyEnabled ? 'Ligada' : 'Desligada'} hint={s.dryRun ? 'modo dry-run' : 'produção'} />
          <StatCard label="Aprovação humana" value={s.requireHumanForCriticalActions ? 'Exigida' : 'Opcional'} hint={`contexto: ${s.maxContextMessages} msgs`} />
        </div>
      )}
      <DataTable columns={cols} rows={runs.data?.items ?? null} loading={runs.loading} error={runs.error} empty="Nenhuma execução de IA." />
    </div>
  );
}
