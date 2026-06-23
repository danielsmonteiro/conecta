'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field, FormActions } from '@/components/Form';
import { ErrorState, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { Paged } from '@/lib/useApi';

interface HealthUnit { id: string; name: string; }

const TYPES = [
  ['SINGLE_SHIFT', 'Plantão avulso'],
  ['RECURRING_SHIFT', 'Escala recorrente'],
  ['TEMPORARY_COVERAGE', 'Cobertura temporária'],
  ['MONTHLY_CONTRACT', 'Contrato mensal'],
  ['ON_DEMAND', 'Sob demanda'],
  ['RESERVE_POOL', 'Banco de reserva'],
  ['OTHER', 'Outro'],
];
const STATUSES = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE'];

export default function NovoContratoPage() {
  const router = useRouter();
  const [units, setUnits] = useState<HealthUnit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: '', type: 'SINGLE_SHIFT', healthUnitId: '', startsAt: '', endsAt: '',
    requiredDoctors: 1, status: 'DRAFT', clientAmount: '', doctorAmount: '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get<Paged<HealthUnit>>('/health-units?limit=100').then((r) => setUnits(r.items)).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    try {
      const payload: any = {
        name: f.name, type: f.type, healthUnitId: f.healthUnitId,
        startsAt: f.startsAt, requiredDoctors: Number(f.requiredDoctors), status: f.status,
      };
      if (f.endsAt) payload.endsAt = f.endsAt;
      if (f.clientAmount) payload.clientAmount = Number(f.clientAmount);
      if (f.doctorAmount) payload.doctorAmount = Number(f.doctorAmount);
      await api.post('/contracts', payload);
      router.push('/contratos');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar contrato');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo contrato" subtitle="Cadastre um contrato operacional." />
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
          <Field label="Unidade de saúde *">
            <select className="input" required value={f.healthUnitId} onChange={(e) => set('healthUnitId', e.target.value)}>
              <option value="">Selecione a unidade</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Início *">
            <input className="input" type="date" required value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
          </Field>
          <Field label="Fim">
            <input className="input" type="date" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
          </Field>
          <Field label="Quantidade de profissionais *">
            <input className="input" type="number" min={1} required value={f.requiredDoctors} onChange={(e) => set('requiredDoctors', Number(e.target.value))} />
          </Field>
          <Field label="Status">
            <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Valor cliente (R$)">
            <input className="input" type="number" step="0.01" value={f.clientAmount} onChange={(e) => set('clientAmount', e.target.value)} />
          </Field>
          <Field label="Valor profissional (R$)">
            <input className="input" type="number" step="0.01" value={f.doctorAmount} onChange={(e) => set('doctorAmount', e.target.value)} />
          </Field>
        </div>
        <FormActions onCancel={() => router.back()} saving={saving} submitLabel="Criar contrato" />
      </form>
    </div>
  );
}
