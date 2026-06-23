'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field, FormActions } from '@/components/Form';
import { ErrorState, Loading, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

const TYPES = [
  ['HEALTH_CORPORATION', 'Corporativa de saúde'], ['PUBLIC_AGENCY', 'Órgão público'],
  ['PRIVATE_GROUP', 'Grupo privado'], ['PPP', 'Parceria público-privada'],
  ['NONPROFIT', 'Sem fins lucrativos'], ['OTHER', 'Outro'],
];
const STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING_SETUP', 'BLOCKED', 'ARCHIVED'];

export default function EditarOrganizacaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [f, setF] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get<any>(`/organizations/${id}/profile`).then((o) =>
      setF({ name: o.name, type: o.type, status: o.status, legalName: o.legalName ?? '', documentNumber: o.documentNumber ?? '', email: o.email ?? '', phone: o.phone ?? '', mainContactName: o.mainContactName ?? '' }),
    ).catch((e) => setError(e.message));
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await api.put(`/organizations/${id}`, f);
      router.push(`/organizacoes/${id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (error && !f) return <ErrorState message={error} />;
  if (!f) return <Loading />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Editar organização" />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Field label="Nome *"><input className="input" required value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo *"><select className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Status"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Razão social"><input className="input" value={f.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
          <Field label="Documento"><input className="input" value={f.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} /></Field>
          <Field label="E-mail"><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Telefone"><input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Contato"><input className="input" value={f.mainContactName} onChange={(e) => set('mainContactName', e.target.value)} /></Field>
        </div>
        <FormActions onCancel={() => router.back()} saving={saving} submitLabel="Salvar alterações" />
      </form>
    </div>
  );
}
