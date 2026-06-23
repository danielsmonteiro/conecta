'use client';

import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, Panel } from '@/components/ui';
import { Paged, useApi } from '@/lib/useApi';

interface Specialty {
  id: string;
  name: string;
  requiresRqe: boolean;
  active: boolean;
}
interface DocType {
  id: string;
  name: string;
  requiredByDefault: boolean;
  active: boolean;
}
interface AiStatus {
  enabled: boolean;
  model: string;
}

const ativo = (a: boolean) => (a ? <span className="text-hm-success">ativo</span> : <span className="text-hm-text-subtle">inativo</span>);

const specCols: Column<Specialty>[] = [
  { header: 'Especialidade', render: (r) => <span className="font-medium text-hm-text">{r.name}</span> },
  { header: 'Exige RQE', render: (r) => <span className="text-hm-text-muted">{r.requiresRqe ? 'sim' : 'não'}</span> },
  { header: 'Status', render: (r) => ativo(r.active) },
];
const docCols: Column<DocType>[] = [
  { header: 'Tipo de documento', render: (r) => <span className="font-medium text-hm-text">{r.name}</span> },
  { header: 'Obrigatório', render: (r) => <span className="text-hm-text-muted">{r.requiredByDefault ? 'sim' : 'não'}</span> },
  { header: 'Status', render: (r) => ativo(r.active) },
];

export default function ConfiguracoesPage() {
  const specs = useApi<Paged<Specialty>>('/specialties?includeInactive=true&limit=100');
  const docs = useApi<Paged<DocType>>('/document-types?includeInactive=true&limit=100');
  const ai = useApi<AiStatus>('/ai/status');

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Catálogos e parâmetros da operação." />

      <Panel title="Inteligência Artificial">
        <p className="text-sm text-hm-text-muted">
          Status: <span className="font-medium text-hm-text">{ai.data?.enabled ? 'Ativa' : 'Inativa'}</span>
          {ai.data?.model ? ` · Modelo: ${ai.data.model}` : ''}
        </p>
      </Panel>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-hm-text">Especialidades</h2>
        <DataTable columns={specCols} rows={specs.data?.items ?? null} loading={specs.loading} error={specs.error} empty="Nenhuma especialidade." />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-hm-text">Tipos de documento</h2>
        <DataTable columns={docCols} rows={docs.data?.items ?? null} loading={docs.loading} error={docs.error} empty="Nenhum tipo de documento." />
      </div>
    </div>
  );
}
