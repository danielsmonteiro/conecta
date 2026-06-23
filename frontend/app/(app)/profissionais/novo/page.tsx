'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Field, FormActions } from '@/components/Form';
import { ErrorState, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { Paged } from '@/lib/useApi';

interface Cbo { id: string; name: string; cbo2002Code: string | null; }
interface Specialty { id: string; name: string; }

const TYPES = ['PHYSICIAN', 'NURSE', 'NURSING_TECHNICIAN', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'NUTRITIONIST', 'DENTIST', 'PHARMACIST', 'OTHER'];
const COUNCILS = ['CRM', 'COREN', 'CREFITO', 'CRP', 'CRN', 'CRF', 'CRO', 'OTHER'];
const GENDERS = [['NOT_INFORMED', 'Não informado'], ['MALE', 'Masculino'], ['FEMALE', 'Feminino'], ['OTHER', 'Outro']];

export default function NovoProfissionalPage() {
  const router = useRouter();
  const [cbos, setCbos] = useState<Cbo[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    fullName: '', whatsapp: '', professionalType: 'PHYSICIAN', council: 'CRM',
    gender: 'NOT_INFORMED', primaryCboId: '', mainSpecialtyId: '', email: '', phone: '',
    cpf: '', crmNumber: '', crmState: '', city: '', state: '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get<Paged<Cbo>>('/cbos?limit=100').then((r) => setCbos(r.items)).catch(() => {});
    api.get<Paged<Specialty>>('/specialties?limit=100').then((r) => setSpecialties(r.items)).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    try {
      const payload: any = {
        fullName: f.fullName, whatsapp: f.whatsapp, professionalType: f.professionalType,
        council: f.council, gender: f.gender, primaryCboId: f.primaryCboId,
      };
      for (const k of ['mainSpecialtyId', 'email', 'phone', 'cpf', 'crmNumber', 'crmState', 'city', 'state'] as const)
        if (f[k]) payload[k] = f[k];
      await api.post('/health-professionals', payload);
      router.push('/profissionais');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar profissional');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo profissional" subtitle="Cadastre um profissional de saúde." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Field label="Nome completo *">
          <input className="input" required value={f.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Ex.: Ana Carolina Souza" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="WhatsApp *">
            <input className="input" required value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Tipo profissional *">
            <select className="input" value={f.professionalType} onChange={(e) => set('professionalType', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="CBO principal *">
            <select className="input" required value={f.primaryCboId} onChange={(e) => set('primaryCboId', e.target.value)}>
              <option value="">Selecione o CBO</option>
              {cbos.map((c) => <option key={c.id} value={c.id}>{c.name}{c.cbo2002Code ? ` (${c.cbo2002Code})` : ''}</option>)}
            </select>
          </Field>
          <Field label="Especialidade principal">
            <select className="input" value={f.mainSpecialtyId} onChange={(e) => set('mainSpecialtyId', e.target.value)}>
              <option value="">Não definida</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Conselho">
            <select className="input" value={f.council} onChange={(e) => set('council', e.target.value)}>
              {COUNCILS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Gênero">
            <select className="input" value={f.gender} onChange={(e) => set('gender', e.target.value)}>
              {GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Nº do registro (CRM)">
            <input className="input" value={f.crmNumber} onChange={(e) => set('crmNumber', e.target.value)} />
          </Field>
          <Field label="UF do registro">
            <input className="input" value={f.crmState} onChange={(e) => set('crmState', e.target.value)} maxLength={2} placeholder="CE" />
          </Field>
          <Field label="E-mail">
            <input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Telefone">
            <input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Cidade">
            <input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="UF">
            <input className="input" value={f.state} onChange={(e) => set('state', e.target.value)} maxLength={2} />
          </Field>
        </div>
        <FormActions onCancel={() => router.back()} saving={saving} submitLabel="Criar profissional" />
      </form>
    </div>
  );
}
