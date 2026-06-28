'use client';

import { useState } from 'react';
import { Column, DataTable } from '@/components/DataTable';
import { PageHeader, Panel, StatCard, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { Paged, useApi } from '@/lib/useApi';

interface Status {
  provider: string;
  hasAccountSid: boolean;
  hasAuthToken: boolean;
  hasPhoneNumber: boolean;
  hasWhatsappFrom: boolean;
  validateSignatureEnabled: boolean;
  isConfigured: boolean;
  twilioMessagingServiceConfigured: boolean;
}
interface Provider {
  provider: string;
  channel: string;
  enabled: boolean;
  configured: boolean;
}
interface Outbound {
  id: string;
  to: string;
  status: string;
  createdAt: string;
}
interface Adapter {
  key: string;
  official: boolean;
  configured: boolean;
  isDefault: boolean;
}

const provCols: Column<Provider>[] = [
  { header: 'Provedor', render: (r) => <span className="font-medium text-hm-text">{r.provider}</span> },
  { header: 'Canal', render: (r) => <span className="text-hm-text-muted">{r.channel}</span> },
  { header: 'Habilitado', render: (r) => (r.enabled ? <span className="text-hm-success">sim</span> : <span className="text-hm-text-subtle">não</span>) },
  { header: 'Configurado', render: (r) => (r.configured ? <span className="text-hm-success">sim</span> : <span className="text-hm-warning">não</span>) },
];
const adapterCols: Column<Adapter>[] = [
  { header: 'Canal', render: (r) => <span className="font-medium text-hm-text">{r.key === 'twilio' ? 'Twilio' : r.key === 'openwa' ? 'OpenWA' : r.key}</span> },
  {
    header: 'Tipo',
    render: (r) =>
      r.official ? (
        <span className="text-hm-success">Oficial</span>
      ) : (
        <span className="text-hm-warning" title="Automação do WhatsApp Web — risco de ban. Use número dedicado.">Não-oficial ⚠</span>
      ),
  },
  { header: 'Configurado', render: (r) => (r.configured ? <span className="text-hm-success">sim</span> : <span className="text-hm-text-subtle">não</span>) },
  { header: 'Padrão', render: (r) => (r.isDefault ? <span className="text-hm-primary">ativo</span> : <span className="text-hm-text-subtle">—</span>) },
];
const outCols: Column<Outbound>[] = [
  { header: 'Para', render: (r) => <span className="text-hm-text-muted">{r.to}</span> },
  { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { header: 'Data', render: (r) => <span className="text-hm-text-muted">{new Date(r.createdAt).toLocaleString('pt-BR')}</span> },
];

const yn = (b: boolean) => (b ? 'Sim' : 'Não');

export default function IntegracoesPage() {
  const status = useApi<Status>('/integrations/messaging/status');
  const providers = useApi<Provider[]>('/integrations/messaging/providers');
  const outbound = useApi<Paged<Outbound>>('/integrations/outbound-message-logs?limit=10');
  const adapters = useApi<Adapter[]>('/integrations/messaging/adapters');
  const s = status.data;

  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function onSwitch(key: string) {
    if (key === 'openwa' && !window.confirm('OpenWA é não-oficial (risco de ban do número). Definir como canal ativo?')) return;
    setBusy(key);
    setErr(null);
    try {
      await api.post('/integrations/messaging/active', { provider: key });
      adapters.reload();
      status.reload();
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao alternar o canal.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações" subtitle="Provedor de mensageria e logs de envio." />
      {s && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Provedor" value={s.provider} hint={s.isConfigured ? 'configurado' : 'não configurado'} />
          <StatCard label="Credenciais" value={yn(s.hasAccountSid && s.hasAuthToken)} hint="account SID + token" />
          <StatCard label="Número" value={yn(s.hasPhoneNumber || s.hasWhatsappFrom)} hint="phone / WhatsApp from" />
          <StatCard label="Validação de assinatura" value={yn(s.validateSignatureEnabled)} />
        </div>
      )}
      <Panel title="Canais de WhatsApp">
        <p className="mb-3 text-sm text-hm-text-muted">
          Twilio (oficial) é o padrão recomendado para o piloto; OpenWA é não-oficial.
          Clique para definir o <strong>canal ativo</strong> de envio.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(adapters.data ?? []).map((a) => {
            const label = a.key === 'twilio' ? 'Twilio (oficial)' : a.key === 'openwa' ? 'OpenWA (não-oficial)' : a.key;
            return (
              <button
                key={a.key}
                disabled={busy !== null || a.isDefault}
                onClick={() => onSwitch(a.key)}
                className={`rounded-hm-sm px-3 py-1.5 text-sm font-medium transition ${
                  a.isDefault ? 'bg-hm-primary-soft text-hm-primary' : 'text-hm-text-muted hover:bg-hm-surface-muted'
                } ${busy === a.key ? 'opacity-60' : ''}`}
              >
                {a.isDefault ? '● ' : ''}
                {label}
                {!a.configured ? ' — não configurado' : ''}
              </button>
            );
          })}
        </div>
        {err && <p className="mb-3 text-sm text-hm-danger">{err}</p>}
        <DataTable columns={adapterCols} rows={adapters.data ?? null} loading={adapters.loading} error={adapters.error} empty="Nenhum canal." />
      </Panel>
      <Panel title="Provedores">
        <DataTable columns={provCols} rows={providers.data ?? null} loading={providers.loading} error={providers.error} empty="Nenhum provedor." />
      </Panel>
      <Panel title="Mensagens enviadas (recentes)">
        <DataTable columns={outCols} rows={outbound.data?.items ?? null} loading={outbound.loading} error={outbound.error} empty="Nenhum envio." />
      </Panel>
    </div>
  );
}
