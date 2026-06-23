'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorState, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

interface HealthUnit {
  id: string;
  name: string;
}
interface Paged<T> {
  items: T[];
}

const STATUSES = ['DRAFT', 'OPEN', 'MATCHING'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const WORK_MODELS = ['ONSITE', 'REMOTE', 'HYBRID'];

export default function NovaVagaPage() {
  const router = useRouter();
  const [units, setUnits] = useState<HealthUnit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    healthUnitId: '',
    startsAt: '',
    endsAt: '',
    requiredDoctors: 1,
    status: 'DRAFT',
    priority: 'NORMAL',
    workModel: 'ONSITE',
    clientAmount: '',
    doctorAmount: '',
    description: '',
  });

  useEffect(() => {
    api.get<Paged<HealthUnit>>('/health-units').then((r) => setUnits(r.items)).catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        healthUnitId: form.healthUnitId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        requiredDoctors: Number(form.requiredDoctors),
        status: form.status,
        priority: form.priority,
        workModel: form.workModel,
        clientAmount: form.clientAmount ? Number(form.clientAmount) : undefined,
        doctorAmount: form.doctorAmount ? Number(form.doctorAmount) : undefined,
        description: form.description || undefined,
      };
      const created = await api.post<{ id: string }>('/vacancies', payload);
      router.push(`/vagas/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar vaga');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nova vaga" subtitle="Cadastre uma vaga preservando o contrato de dados do produto." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <L label="Título *">
          <input className="input" required value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="Ex.: Plantão clínico em unidade municipal" />
        </L>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <L label="Unidade de saúde *">
            <select className="input" required value={form.healthUnitId} onChange={(e) => set('healthUnitId', e.target.value)}>
              <option value="">Selecione a unidade</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </L>
          <L label="Quantidade de profissionais *">
            <input className="input" type="number" min={1} required value={form.requiredDoctors}
              onChange={(e) => set('requiredDoctors', Number(e.target.value))} />
          </L>
          <L label="Início *">
            <input className="input" type="datetime-local" required value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
          </L>
          <L label="Fim *">
            <input className="input" type="datetime-local" required value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
          </L>
          <L label="Status">
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </L>
          <L label="Prioridade">
            <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </L>
          <L label="Modelo de trabalho">
            <select className="input" value={form.workModel} onChange={(e) => set('workModel', e.target.value)}>
              {WORK_MODELS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </L>
          <L label="Valor cliente (R$)">
            <input className="input" type="number" step="0.01" value={form.clientAmount} onChange={(e) => set('clientAmount', e.target.value)} />
          </L>
          <L label="Valor profissional (R$)">
            <input className="input" type="number" step="0.01" value={form.doctorAmount} onChange={(e) => set('doctorAmount', e.target.value)} />
          </L>
        </div>

        <L label="Descrição">
          <textarea className="input min-h-24" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </L>

        <div className="flex justify-end gap-2 border-t border-hm-border-soft pt-4">
          <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Criando…' : 'Criar vaga'}</button>
        </div>
      </form>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-hm-text">{label}</span>
      {children}
    </label>
  );
}
