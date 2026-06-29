'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field, FormActions } from '@/components/Form';
import { ErrorState, Loading, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { toDateTimeLocal } from '@/lib/format';
import { Paged } from '@/lib/useApi';

const STATUSES = ['DRAFT', 'OPEN', 'MATCHING', 'RECEIVING_APPLICATIONS', 'PARTIALLY_FILLED', 'FILLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const WORK_MODELS = ['ONSITE', 'REMOTE', 'HYBRID'];
const REQUIRED_DOC_KINDS: [string, string][] = [
  ['registro_profissional', 'Registro profissional'],
  ['identificacao', 'Documento de identificação'],
  ['curriculo', 'Currículo'],
  ['certificado', 'Certificados'],
  ['comprovante_vaga', 'Comprovante exigido pela vaga'],
];

export default function EditarVagaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [f, setF] = useState<any>(null);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get<any>(`/vacancies/${id}/profile`).then((v) =>
      setF({ title: v.title, healthUnitId: v.healthUnit?.id ?? v.healthUnitId ?? '', startsAt: toDateTimeLocal(v.startsAt), endsAt: toDateTimeLocal(v.endsAt), requiredDoctors: v.requiredDoctors, status: v.status, priority: v.priority, workModel: v.workModel, clientAmount: v.clientAmount ?? '', doctorAmount: v.doctorAmount ?? '', description: v.description ?? '', requiredDocuments: v.requiredDocuments ?? [] }),
    ).catch((e) => setError(e.message));
    api.get<Paged<any>>('/health-units?limit=100').then((r) => setUnits(r.items)).catch(() => {});
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload: any = {
        title: f.title, healthUnitId: f.healthUnitId, status: f.status, priority: f.priority, workModel: f.workModel,
        startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString(), requiredDoctors: Number(f.requiredDoctors),
        description: f.description || undefined,
      };
      if (f.clientAmount !== '') payload.clientAmount = Number(f.clientAmount);
      if (f.doctorAmount !== '') payload.doctorAmount = Number(f.doctorAmount);
      payload.requiredDocuments = f.requiredDocuments ?? [];
      await api.put(`/vacancies/${id}`, payload);
      router.push(`/vagas/${id}`);
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
      <PageHeader title="Editar vaga" />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Field label="Título *"><input className="input" required value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Unidade *"><select className="input" required value={f.healthUnitId} onChange={(e) => set('healthUnitId', e.target.value)}><option value="">Selecione</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Profissionais *"><input className="input" type="number" min={1} required value={f.requiredDoctors} onChange={(e) => set('requiredDoctors', Number(e.target.value))} /></Field>
          <Field label="Início *"><input className="input" type="datetime-local" required value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
          <Field label="Fim *"><input className="input" type="datetime-local" required value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></Field>
          <Field label="Status"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Prioridade"><select className="input" value={f.priority} onChange={(e) => set('priority', e.target.value)}>{PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Modelo de trabalho"><select className="input" value={f.workModel} onChange={(e) => set('workModel', e.target.value)}>{WORK_MODELS.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Valor cliente (R$)"><input className="input" type="number" step="0.01" value={f.clientAmount} onChange={(e) => set('clientAmount', e.target.value)} /></Field>
          <Field label="Valor profissional (R$)"><input className="input" type="number" step="0.01" value={f.doctorAmount} onChange={(e) => set('doctorAmount', e.target.value)} /></Field>
        </div>
        <Field label="Descrição"><textarea className="input min-h-24" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-hm-text">Documentos obrigatórios para confirmar candidatura</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REQUIRED_DOC_KINDS.map(([kind, label]) => (
              <label key={kind} className="flex items-center gap-2 text-sm text-hm-text">
                <input type="checkbox" checked={(f.requiredDocuments ?? []).includes(kind)}
                  onChange={() => set('requiredDocuments', (f.requiredDocuments ?? []).includes(kind) ? f.requiredDocuments.filter((k: string) => k !== kind) : [...(f.requiredDocuments ?? []), kind])} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <FormActions onCancel={() => router.back()} saving={saving} submitLabel="Salvar alterações" />
      </form>
    </div>
  );
}
