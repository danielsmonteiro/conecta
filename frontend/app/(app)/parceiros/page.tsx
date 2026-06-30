'use client';

import { useState } from 'react';
import { Column, DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { Paged, useApi } from '@/lib/useApi';

interface Partner {
  id: string;
  name: string;
  apiKeyPrefix: string;
  active: boolean;
  scopes: string[];
  webhookUrl: string | null;
  events: string[];
  hasWebhookSecret?: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}
interface ScopesInfo { scopes: string[]; events: string[] }
interface Secret { title: string; apiKey?: string; webhookSecret?: string }

const emptyForm = { name: '', scopes: [] as string[], webhookUrl: '', events: [] as string[], active: true };

export default function ParceirosPage() {
  const { data, loading, error, reload } = useApi<Paged<Partner>>('/partners');
  const { data: info } = useApi<ScopesInfo>('/partners/available-scopes');
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const allScopes = info?.scopes ?? [];
  const allEvents = info?.events ?? [];

  function openCreate() {
    setEditingId(null); setErr(null);
    setForm({ ...emptyForm, scopes: ['*'] });
  }
  function openEdit(p: Partner) {
    setEditingId(p.id); setErr(null);
    setForm({ name: p.name, scopes: p.scopes ?? [], webhookUrl: p.webhookUrl ?? '', events: p.events ?? [], active: p.active });
  }
  function toggle(list: string[], v: string) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  async function save() {
    if (!form) return;
    setBusy(true); setErr(null);
    const payload: any = { name: form.name, scopes: form.scopes, events: form.events, webhookUrl: form.webhookUrl || undefined };
    try {
      if (editingId) {
        await api.patch(`/partners/${editingId}`, { ...payload, active: form.active });
      } else {
        const created = await api.post<any>('/partners', payload);
        setSecret({ title: `Credenciais de "${created.name}"`, apiKey: created.apiKey, webhookSecret: created.webhookSecret });
      }
      setForm(null); setEditingId(null); reload();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function toggleActive(p: Partner) {
    await api.patch(`/partners/${p.id}`, { active: !p.active }); reload();
  }
  async function rotateKey(p: Partner) {
    if (!confirm(`Gerar uma nova API key para "${p.name}"? A chave atual deixará de funcionar.`)) return;
    const r = await api.post<any>(`/partners/${p.id}/rotate-key`); setSecret({ title: `Nova API key de "${p.name}"`, apiKey: r.apiKey }); reload();
  }
  async function rotateSecret(p: Partner) {
    if (!confirm(`Gerar um novo segredo de webhook para "${p.name}"?`)) return;
    const r = await api.post<any>(`/partners/${p.id}/rotate-webhook-secret`); setSecret({ title: `Novo segredo de webhook de "${p.name}"`, webhookSecret: r.webhookSecret }); reload();
  }
  async function remove(p: Partner) {
    if (!confirm(`Excluir o parceiro "${p.name}"? Esta ação é irreversível.`)) return;
    await api.del(`/partners/${p.id}`); reload();
  }

  const cols: Column<Partner>[] = [
    { header: 'Parceiro', render: (p) => (
      <div>
        <p className="font-medium text-hm-text">{p.name}</p>
        <p className="font-mono text-xs text-hm-text-subtle">{p.apiKeyPrefix}…</p>
      </div>
    ) },
    { header: 'Escopos', render: (p) => <span className="text-xs text-hm-text-muted">{(p.scopes || []).join(', ') || '—'}</span> },
    { header: 'Webhook', render: (p) => p.webhookUrl
      ? <span className="text-xs text-hm-text-muted" title={(p.events || []).join(', ')}>{p.webhookUrl.length > 32 ? p.webhookUrl.slice(0, 32) + '…' : p.webhookUrl}<br /><span className="text-hm-text-subtle">{(p.events || []).length} evento(s)</span></span>
      : <span className="text-xs text-hm-text-subtle">—</span> },
    { header: 'Status', render: (p) => (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.active ? 'bg-hm-success/15 text-hm-success' : 'bg-hm-text-subtle/15 text-hm-text-subtle'}`}>{p.active ? 'Ativo' : 'Inativo'}</span>
    ) },
    { header: 'Último uso', render: (p) => <span className="text-xs text-hm-text-muted">{p.lastUsedAt ? new Date(p.lastUsedAt).toLocaleString('pt-BR') : 'nunca'}</span> },
    { header: 'Ações', render: (p) => (
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => openEdit(p)}>Editar</button>
        <button className="btn-ghost text-xs" onClick={() => toggleActive(p)}>{p.active ? 'Desativar' : 'Ativar'}</button>
        <button className="btn-ghost text-xs" onClick={() => rotateKey(p)}>Rotacionar chave</button>
        {p.webhookUrl && <button className="btn-ghost text-xs" onClick={() => rotateSecret(p)}>Rotacionar segredo</button>}
        <button className="btn-ghost text-xs text-hm-warning" onClick={() => remove(p)}>Excluir</button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Parceiros de integração"
        subtitle="Chaves de API e webhooks para ferramentas de terceiros (conector)."
        action={<button className="btn-primary" onClick={openCreate}>Novo parceiro</button>}
      />

      {secret && (
        <div className="mb-4 rounded-hm-md border border-hm-warning/40 bg-hm-warning/10 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-hm-text">{secret.title}</p>
              <p className="mt-0.5 text-xs text-hm-warning">Copie agora — estes valores não serão exibidos novamente.</p>
            </div>
            <button className="btn-ghost text-xs" onClick={() => setSecret(null)}>Fechar</button>
          </div>
          {secret.apiKey && <SecretRow label="API key" value={secret.apiKey} />}
          {secret.webhookSecret && <SecretRow label="Webhook secret" value={secret.webhookSecret} />}
        </div>
      )}

      {form && (
        <div className="card mb-4 space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-hm-text">{editingId ? 'Editar parceiro' : 'Novo parceiro'}</h2>
            <button className="btn-ghost text-xs" onClick={() => setForm(null)}>Cancelar</button>
          </div>
          {err && <p className="text-sm text-hm-warning">{err}</p>}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-hm-text">Nome *</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Omnichannel ACME" />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-hm-text">Escopos</span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-hm-text">
                <input type="checkbox" checked={form.scopes.includes('*')} onChange={() => setForm({ ...form, scopes: form.scopes.includes('*') ? [] : ['*'] })} />
                Acesso total (*)
              </label>
              {!form.scopes.includes('*') && allScopes.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-hm-text">
                  <input type="checkbox" checked={form.scopes.includes(s)} onChange={() => setForm({ ...form, scopes: toggle(form.scopes, s) })} />
                  <span className="font-mono text-xs">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-hm-text">Webhook URL (push de eventos)</span>
            <input className="input" value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://parceiro.com/webhooks/healthmatch" />
            <span className="mt-1 block text-xs text-hm-text-subtle">Ao salvar com URL, um segredo de assinatura (HMAC) é gerado e exibido uma vez.</span>
          </label>
          {form.webhookUrl && (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-hm-text">Eventos assinados</span>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {allEvents.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm text-hm-text">
                    <input type="checkbox" checked={form.events.includes(ev)} onChange={() => setForm({ ...form, events: toggle(form.events, ev) })} />
                    <span className="font-mono text-xs">{ev}</span>
                  </label>
                ))}
              </div>
              <span className="mt-1 block text-xs text-hm-text-subtle">Sem nenhum marcado, recebe todos.</span>
            </div>
          )}
          {editingId && (
            <label className="flex items-center gap-2 text-sm text-hm-text">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Ativo
            </label>
          )}
          <div className="flex justify-end gap-2 border-t border-hm-border-soft pt-4">
            <button className="btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-primary" disabled={busy || !form.name.trim()} onClick={save}>{busy ? 'Salvando…' : editingId ? 'Salvar' : 'Criar parceiro'}</button>
          </div>
        </div>
      )}

      <DataTable columns={cols} rows={data?.items ?? null} loading={loading} error={error} empty="Nenhum parceiro cadastrado." />
    </div>
  );
}

function SecretRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }
  return (
    <div className="mt-3">
      <span className="text-xs uppercase tracking-wide text-hm-text-subtle">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-hm-sm bg-hm-surface px-3 py-2 font-mono text-xs text-hm-text">{value}</code>
        <button className="btn-ghost text-xs" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar'}</button>
      </div>
    </div>
  );
}
