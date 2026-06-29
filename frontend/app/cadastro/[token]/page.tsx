'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DocItem { id: string; kind: string; fileName: string; status: string; createdAt: string }
interface Step { key: string; label: string; done: boolean }
interface State {
  status: 'active' | 'expired' | 'confirmed';
  vaga: { cargo: string; cidade: string | null } | null;
  professional: { firstName: string };
  draft: Record<string, any>;
  suggested: Record<string, any>;
  missingMin: string[];
  canConfirm: boolean;
  requiredDocuments: string[];
  missingRequiredDocs: string[];
  steps: Step[];
  remainingToConfirm: number;
  documents: DocItem[];
  savedMessage?: string;
}

const PROF_TYPES: [string, string][] = [
  ['', 'Selecione'], ['PHYSICIAN', 'Médico(a)'], ['NURSE', 'Enfermeiro(a)'],
  ['NURSING_TECHNICIAN', 'Técnico(a) de enfermagem'], ['PHYSIOTHERAPIST', 'Fisioterapeuta'],
  ['PSYCHOLOGIST', 'Psicólogo(a)'], ['NUTRITIONIST', 'Nutricionista'], ['DENTIST', 'Dentista'],
  ['PHARMACIST', 'Farmacêutico(a)'], ['OTHER', 'Outro'],
];
const DOC_KINDS: [string, string][] = [
  ['registro_profissional', 'Registro profissional'], ['identificacao', 'Documento de identificação'],
  ['curriculo', 'Currículo'], ['certificado', 'Certificados'],
];
const DOC_LABEL: Record<string, string> = Object.fromEntries(DOC_KINDS);
const DOC_STATUS_LABEL: Record<string, string> = {
  SENT: 'Enviado', IN_REVIEW: 'Em análise', APPROVED: 'Aprovado', REJECTED: 'Recusado', NEEDS_ADJUSTMENT: 'Precisa de ajuste',
};

export default function CadastroPage() {
  const { token } = useParams<{ token: string }>();
  const [st, setSt] = useState<State | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyState = useCallback((d: State) => {
    setSt(d);
    if (d.status === 'confirmed') setConfirmed(true);
    setForm((prev) => ({ ...d.suggested, ...d.draft, ...prev }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/cadastro/${token}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(res.status === 404 ? 'Link inválido.' : `Erro ${res.status}`);
        applyState(await res.json());
      } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
    })();
  }, [token, applyState]);

  function update(k: string, v: string) {
    const next = { ...form, [k]: v };
    setForm(next);
    setSaved('Salvando…');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autosave(next), 800);
  }

  async function autosave(payload: Record<string, any>) {
    try {
      const res = await fetch(`/api/cadastro/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) { const d: State = await res.json(); setSt(d); setSaved('Cadastro salvo automaticamente.'); }
    } catch { setSaved('Sem conexão — tentaremos salvar de novo.'); }
  }

  async function uploadDoc(kind: string, file: File) {
    setSaved('Enviando documento…');
    const fd = new FormData(); fd.append('file', file); fd.append('kind', kind);
    const res = await fetch(`/api/cadastro/${token}/documents`, { method: 'POST', body: fd });
    if (res.ok) { const r = await fetch(`/api/cadastro/${token}`, { cache: 'no-store' }); if (r.ok) setSt(await r.json()); setSaved('Documento enviado.'); }
    else { const b = await res.json().catch(() => ({})); setSaved(b.message || 'Falha no envio do documento.'); }
  }

  async function confirmar() {
    setConfirming(true); setError(null);
    if (saveTimer.current) { clearTimeout(saveTimer.current); await autosave(form); }
    try {
      const res = await fetch(`/api/cadastro/${token}/confirm`, { method: 'POST' });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || (res.status === 410 ? 'Link expirado.' : `Erro ${res.status}`)); }
      setConfirmed(true);
    } catch (e) { setError((e as Error).message); } finally { setConfirming(false); }
  }

  if (loading) return <Shell><p className="text-sm text-hm-text-subtle">Carregando…</p></Shell>;
  if (error && !st) return <Shell><Card><h1 className="text-lg font-semibold">Link indisponível</h1><p className="mt-2 text-sm text-hm-text-subtle">{error} Você pode pedir um novo link pelo WhatsApp.</p></Card></Shell>;
  if (st?.status === 'expired' && !confirmed) return <Shell><Card><h1 className="text-lg font-semibold">Link expirado</h1><p className="mt-2 text-sm text-hm-text-subtle">Responda no WhatsApp para receber um novo link de cadastro.</p></Card></Shell>;
  if (confirmed) return (
    <Shell><Card>
      <div className="mb-2 text-3xl">✅</div>
      <h1 className="text-lg font-semibold text-hm-text">Sua candidatura foi confirmada com sucesso</h1>
      <p className="mt-2 text-sm text-hm-text-subtle">Seu cadastro foi criado na HealthMatch e sua candidatura{st?.vaga ? ` para a vaga de ${st.vaga.cargo}` : ''} foi registrada. Caso ainda existam documentos complementares pendentes, você poderá enviá-los depois pelo mesmo link.</p>
      <p className="mt-2 text-sm text-hm-text-subtle">Também enviamos uma confirmação para você pelo WhatsApp.</p>
    </Card></Shell>
  );

  const f = (k: string) => form[k] ?? '';

  return (
    <Shell>
      <h1 className="text-xl font-bold text-hm-text">Complete seu cadastro para se candidatar</h1>
      {st?.vaga && <p className="mt-1 text-sm text-hm-text-subtle">Você está se candidatando à vaga de <b>{st.vaga.cargo}</b>{st.vaga.cidade ? ` em ${st.vaga.cidade}` : ''}.</p>}
      <p className="mt-2 text-xs text-hm-text-subtle">Seu cadastro é salvo automaticamente. Você pode começar agora e continuar depois em outro dispositivo pelo mesmo link.</p>

      <div className="sticky top-0 z-10 -mx-5 mt-3 border-b border-hm-border-soft bg-hm-bg/95 px-5 py-2 backdrop-blur">
        <p className="text-sm font-medium text-hm-text">
          {st?.canConfirm ? 'Tudo pronto para confirmar sua candidatura ✅' : `Faltam ${st?.remainingToConfirm ?? 1} etapa(s) para confirmar sua candidatura`}
        </p>
        {saved && <p className="text-xs text-hm-text-subtle">{saved}</p>}
      </div>

      <Section n={1} title="Dados básicos">
        <Field label="Nome completo" req v={f('fullName')} on={(v) => update('fullName', v)} />
        <Field label="CPF" v={f('cpf')} on={(v) => update('cpf', v)} />
        <Field label="Data de nascimento" type="date" v={f('birthDate')} on={(v) => update('birthDate', v)} />
        <Field label="WhatsApp" v={f('whatsapp')} on={(v) => update('whatsapp', v)} />
        <Field label="E-mail" type="email" v={f('email')} on={(v) => update('email', v)} />
      </Section>

      <Section n={2} title="Perfil profissional">
        <Field label="Profissão" req v={f('profession')} on={(v) => update('profession', v)} />
        <Select label="Tipo de profissional" v={f('professionalType')} on={(v) => update('professionalType', v)} options={PROF_TYPES} />
        <Field label="Especialidade" v={f('specialtyName')} on={(v) => update('specialtyName', v)} />
        <Field label="Registro profissional (nº)" v={f('councilNumber')} on={(v) => update('councilNumber', v)} />
        <Field label="Tempo de experiência" v={f('experience')} on={(v) => update('experience', v)} />
        <Field label="Cidade de atuação" req v={f('city')} on={(v) => update('city', v)} />
        <Field label="UF" v={f('state')} on={(v) => update('state', v)} />
      </Section>

      <Section n={3} title="Disponibilidade">
        <Field label="Disponibilidade de horário" v={f('availability')} on={(v) => update('availability', v)} />
        <Field label="Tipo de contratação desejado" v={f('contractType')} on={(v) => update('contractType', v)} />
        <Field label="Região de interesse" v={f('regionPreference')} on={(v) => update('regionPreference', v)} />
      </Section>

      <Section n={4} title="Documentos">
        <p className="text-xs text-hm-text-subtle">PDF, JPG ou PNG. Documentos <b>obrigatórios</b> desta vaga precisam ser enviados antes de confirmar; os demais são complementares e podem ficar para depois.</p>
        {DOC_KINDS.map(([kind, label]) => {
          const doc = st?.documents.find((d) => d.kind === kind);
          const required = st?.requiredDocuments?.includes(kind);
          return (
            <div key={kind} className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-hm-text">{label}{required && <span className="text-hm-warning"> · obrigatório</span>}</span>
                {doc ? <span className="text-xs text-hm-success">{DOC_STATUS_LABEL[doc.status] || doc.status}</span> : <span className={`text-xs ${required ? 'text-hm-warning' : 'text-hm-text-subtle'}`}>não enviado</span>}
              </div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mt-1 block w-full text-xs"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadDoc(kind, file); }} />
              {doc && <p className="mt-0.5 text-xs text-hm-text-subtle">{doc.fileName}</p>}
            </div>
          );
        })}
      </Section>

      <Section n={5} title="Confirmação">
        <p className="text-sm text-hm-text-subtle">Revise seus dados principais e confirme sua candidatura.</p>
        {!!st?.missingMin.length && <p className="mt-2 text-sm text-hm-warning">Faltam dados mínimos: {st?.missingMin.join(', ')}.</p>}
        {!!st?.missingRequiredDocs?.length && (
          <p className="mt-2 text-sm text-hm-warning">
            Envie os documentos obrigatórios da vaga: {st.missingRequiredDocs.map((k) => DOC_LABEL[k] || k).join(', ')}.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-hm-warning">{error}</p>}
        <button type="button" onClick={confirmar} disabled={!st?.canConfirm || confirming}
          className="btn-primary mt-3 w-full py-4 text-base font-semibold disabled:opacity-50">
          {confirming ? 'Confirmando…' : 'Confirmar candidatura'}
        </button>
        <p className="mt-3 text-center text-xs text-hm-text-subtle">Ao confirmar, você demonstra interesse nesta vaga. Isso não garante contratação nem aprovação no processo.</p>
      </Section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-hm-bg px-5 py-6">
      <div className="mb-4 text-lg font-bold tracking-tight text-hm-primary">HealthMatch</div>
      {children}
    </main>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-hm-md border border-hm-border-soft bg-hm-surface p-5 shadow-sm">{children}</div>;
}
function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-hm-md border border-hm-border-soft bg-hm-surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-hm-text">Etapa {n} — {title}</h2>
      {children}
    </section>
  );
}
function Field({ label, v, on, type = 'text', req }: { label: string; v: string; on: (v: string) => void; type?: string; req?: boolean }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs text-hm-text-subtle">{label}{req && <span className="text-hm-warning"> *</span>}</span>
      <input type={type} value={v} onChange={(e) => on(e.target.value)}
        className="mt-1 w-full rounded-hm-sm border border-hm-border-soft bg-hm-bg px-3 py-2.5 text-sm text-hm-text outline-none focus:border-hm-primary" />
    </label>
  );
}
function Select({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs text-hm-text-subtle">{label}</span>
      <select value={v} onChange={(e) => on(e.target.value)}
        className="mt-1 w-full rounded-hm-sm border border-hm-border-soft bg-hm-bg px-3 py-2.5 text-sm text-hm-text outline-none focus:border-hm-primary">
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </label>
  );
}
