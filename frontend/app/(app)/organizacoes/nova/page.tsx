'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, FormActions } from '@/components/Form';
import { ErrorState, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

const TYPES = [
  ['HEALTH_CORPORATION', 'Corporativa de saúde'],
  ['PUBLIC_AGENCY', 'Órgão público'],
  ['PRIVATE_GROUP', 'Grupo privado'],
  ['PPP', 'Parceria público-privada'],
  ['NONPROFIT', 'Sem fins lucrativos'],
  ['OTHER', 'Outro'],
];

export default function NovaOrganizacaoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: '', type: 'HEALTH_CORPORATION', legalName: '', documentNumber: '',
    email: '', phone: '', mainContactName: '', description: '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    try {
      const payload: any = { name: f.name, type: f.type };
      for (const k of ['legalName', 'documentNumber', 'email', 'phone', 'mainContactName', 'description'] as const)
        if (f[k]) payload[k] = f[k];
      await api.post('/organizations', payload);
      router.push('/organizacoes');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar organização');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nova organização" subtitle="Cadastre uma instituição ou parceiro." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Field label="Nome *">
          <input className="input" required value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo *">
            <select className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Razão social">
            <input className="input" value={f.legalName} onChange={(e) => set('legalName', e.target.value)} />
          </Field>
          <Field label="Documento (CNPJ)">
            <input className="input" value={f.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} />
          </Field>
          <Field label="Nome do contato">
            <input className="input" value={f.mainContactName} onChange={(e) => set('mainContactName', e.target.value)} />
          </Field>
          <Field label="E-mail">
            <input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Telefone">
            <input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>
        <Field label="Descrição">
          <textarea className="input min-h-24" value={f.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <FormActions onCancel={() => router.back()} saving={saving} submitLabel="Criar organização" />
      </form>
    </div>
  );
}
