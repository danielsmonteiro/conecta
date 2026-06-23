'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field, FormActions } from '@/components/Form';
import { ErrorState, Loading, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { toDateInput } from '@/lib/format';
import { Paged } from '@/lib/useApi';

const TYPES = ['SINGLE_SHIFT', 'RECURRING_SHIFT', 'TEMPORARY_COVERAGE', 'MONTHLY_CONTRACT', 'ON_DEMAND', 'RESERVE_POOL', 'OTHER'];
const STATUSES = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];

export default function EditarContratoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [f, setF] = useState<any>(null);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get<any>(`/contracts/${id}/profile`).then((c) =>
      setF({ name: c.name, type: c.type, status: c.status, healthUnitId: c.healthUnit?.id ?? c.healthUnitId ?? '', startsAt: toDateInput(c.startsAt), endsAt: toDateInput(c.endsAt), requiredDoctors: c.requiredDoctors, clientAmount: c.clientAmount ?? '', doctorAmount: c.doctorAmount ?? '' }),
    ).catch((e) => setError(e.message));
    api.get<Paged<any>>('/health-units?limit=100').then((r) => setUnits(r.items)).catch(() => {});
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload: any = { name: f.name, type: f.type, status: f.status, healthUnitId: f.healthUnitId, startsAt: f.startsAt, requiredDoctors: Number(f.requiredDoctors) };
      if (f.endsAt) payload.endsAt = f.endsAt;
      if (f.clientAmount !== '') payload.clientAmount = Number(f.clientAmount);
      if (f.doctorAmount !== '') payload.doctorAmount = Number(f.doctorAmount);
      await api.put(`/contracts/${id}`, payload);
      router.push(`/contratos/${id}`);
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
      <PageHeader title="Editar contrato" />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Field label="Nome *"><input className="input" required value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo *"><select className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Status"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Unidade de saúde *"><select className="input" required value={f.healthUnitId} onChange={(e) => set('healthUnitId', e.target.value)}><option value="">Selecione</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Profissionais *"><input className="input" type="number" min={1} required value={f.requiredDoctors} onChange={(e) => set('requiredDoctors', Number(e.target.value))} /></Field>
          <Field label="Início *"><input className="input" type="date" required value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
          <Field label="Fim"><input className="input" type="date" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></Field>
          <Field label="Valor cliente (R$)"><input className="input" type="number" step="0.01" value={f.clientAmount} onChange={(e) => set('clientAmount', e.target.value)} /></Field>
          <Field label="Valor profissional (R$)"><input className="input" type="number" step="0.01" value={f.doctorAmount} onChange={(e) => set('doctorAmount', e.target.value)} /></Field>
        </div>
        <FormActions onCancel={() => router.back()} saving={saving} submitLabel="Salvar alterações" />
      </form>
    </div>
  );
}
