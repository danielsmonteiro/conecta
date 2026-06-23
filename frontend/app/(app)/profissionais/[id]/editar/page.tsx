'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field, FormActions } from '@/components/Form';
import { ErrorState, Loading, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { Paged } from '@/lib/useApi';

const TYPES = ['PHYSICIAN', 'NURSE', 'NURSING_TECHNICIAN', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'NUTRITIONIST', 'DENTIST', 'PHARMACIST', 'OTHER'];
const COUNCILS = ['CRM', 'COREN', 'CREFITO', 'CRP', 'CRN', 'CRF', 'CRO', 'OTHER'];
const GENDERS = [['NOT_INFORMED', 'Não informado'], ['MALE', 'Masculino'], ['FEMALE', 'Feminino'], ['OTHER', 'Outro']];
const STATUSES = ['INCOMPLETE', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'ARCHIVED'];

export default function EditarProfissionalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [f, setF] = useState<any>(null);
  const [cbos, setCbos] = useState<{ id: string; name: string }[]>([]);
  const [specs, setSpecs] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get<any>(`/health-professionals/${id}/profile`).then((p) =>
      setF({ fullName: p.fullName, whatsapp: p.whatsapp, professionalType: p.professionalType, council: p.council ?? 'CRM', gender: p.gender, status: p.status, primaryCboId: p.primaryCbo?.id ?? p.primaryCboId ?? '', mainSpecialtyId: p.mainSpecialty?.id ?? p.mainSpecialtyId ?? '', email: p.email ?? '', phone: p.phone ?? '', crmNumber: p.crmNumber ?? '', crmState: p.crmState ?? '', city: p.city ?? '', state: p.state ?? '' }),
    ).catch((e) => setError(e.message));
    api.get<Paged<any>>('/cbos?limit=100').then((r) => setCbos(r.items)).catch(() => {});
    api.get<Paged<any>>('/specialties?limit=100').then((r) => setSpecs(r.items)).catch(() => {});
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload: any = { fullName: f.fullName, whatsapp: f.whatsapp, professionalType: f.professionalType, council: f.council, gender: f.gender, status: f.status, primaryCboId: f.primaryCboId };
      for (const k of ['mainSpecialtyId', 'email', 'phone', 'crmNumber', 'crmState', 'city', 'state'])
        if (f[k]) payload[k] = f[k];
      await api.put(`/health-professionals/${id}`, payload);
      router.push(`/profissionais/${id}`);
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
      <PageHeader title="Editar profissional" />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Field label="Nome completo *"><input className="input" required value={f.fullName} onChange={(e) => set('fullName', e.target.value)} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="WhatsApp *"><input className="input" required value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
          <Field label="Tipo profissional *"><select className="input" value={f.professionalType} onChange={(e) => set('professionalType', e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="CBO principal *"><select className="input" required value={f.primaryCboId} onChange={(e) => set('primaryCboId', e.target.value)}><option value="">Selecione</option>{cbos.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Especialidade"><select className="input" value={f.mainSpecialtyId} onChange={(e) => set('mainSpecialtyId', e.target.value)}><option value="">Não definida</option>{specs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Conselho"><select className="input" value={f.council} onChange={(e) => set('council', e.target.value)}>{COUNCILS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="Gênero"><select className="input" value={f.gender} onChange={(e) => set('gender', e.target.value)}>{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Status"><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Nº registro (CRM)"><input className="input" value={f.crmNumber} onChange={(e) => set('crmNumber', e.target.value)} /></Field>
          <Field label="UF registro"><input className="input" maxLength={2} value={f.crmState} onChange={(e) => set('crmState', e.target.value)} /></Field>
          <Field label="E-mail"><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Telefone"><input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Cidade"><input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="UF"><input className="input" maxLength={2} value={f.state} onChange={(e) => set('state', e.target.value)} /></Field>
        </div>
        <FormActions onCancel={() => router.back()} saving={saving} submitLabel="Salvar alterações" />
      </form>
    </div>
  );
}
