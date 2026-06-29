'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Vaga {
  titulo: string;
  cargo: string;
  estabelecimento: string;
  unidade: string | null;
  cidade: string | null;
  modalidade: string | null;
  contratacao: string | null;
  cargaHoraria: string;
  escala: string | null;
  remuneracao: number | null;
  moeda: string;
  prioridade: string;
  descricao: string | null;
  inicio: string | null;
}
interface ViewData {
  status: 'active' | 'expired' | 'confirmed';
  expiresAt: string;
  pendingFields: string[];
  professional: { firstName: string };
  vaga: Vaga | null;
}

function brl(v: number, moeda = 'BRL') {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(v);
  } catch {
    return `R$ ${v.toFixed(2)}`;
  }
}

export default function HotsitePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/hotsite/${token}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(res.status === 404 ? 'Link inválido.' : `Erro ${res.status}`);
        const d: ViewData = await res.json();
        setData(d);
        if (d.status === 'confirmed') setConfirmed(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function confirmar() {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch(`/api/hotsite/${token}/confirm`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || (res.status === 410 ? 'Este link expirou.' : `Erro ${res.status}`));
      }
      setConfirmed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-hm-bg px-5 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight text-hm-primary">HealthMatch</span>
      </div>

      {loading && <p className="text-sm text-hm-text-subtle">Carregando…</p>}

      {!loading && error && !data && (
        <Card>
          <h1 className="text-lg font-semibold text-hm-text">Link indisponível</h1>
          <p className="mt-2 text-sm text-hm-text-subtle">{error}</p>
          <p className="mt-3 text-sm text-hm-text-subtle">Você pode pedir um novo link pelo WhatsApp.</p>
        </Card>
      )}

      {!loading && data?.status === 'expired' && !confirmed && (
        <Card>
          <h1 className="text-lg font-semibold text-hm-text">Link expirado</h1>
          <p className="mt-2 text-sm text-hm-text-subtle">
            Este link de candidatura expirou. Responda no WhatsApp para receber um novo link.
          </p>
        </Card>
      )}

      {!loading && confirmed && (
        <Card>
          <div className="mb-2 text-3xl">✅</div>
          <h1 className="text-lg font-semibold text-hm-text">Candidatura confirmada com sucesso</h1>
          <p className="mt-2 text-sm text-hm-text-subtle">
            A HealthMatch registrou seu interesse nessa oportunidade. O contratante responsável poderá analisar seu
            perfil e avançar com as próximas etapas do processo seletivo.
          </p>
          <p className="mt-2 text-sm text-hm-text-subtle">Também enviamos uma confirmação para você pelo WhatsApp.</p>
        </Card>
      )}

      {!loading && data?.status === 'active' && !confirmed && data.vaga && (
        <>
          <Card>
            <p className="text-xs uppercase tracking-wide text-hm-text-subtle">Oportunidade para você</p>
            <h1 className="mt-1 text-xl font-bold text-hm-text">{data.vaga.cargo}</h1>
            <p className="mt-1 text-sm text-hm-text-subtle">
              {data.vaga.estabelecimento}
              {data.vaga.unidade ? ` · ${data.vaga.unidade}` : ''}
              {data.vaga.cidade ? ` · ${data.vaga.cidade}` : ''}
            </p>

            {data.vaga.descricao && <p className="mt-4 text-sm text-hm-text">{data.vaga.descricao}</p>}

            <dl className="mt-4 space-y-2.5">
              <Row label="Carga horária" value={data.vaga.cargaHoraria} />
              {data.vaga.escala && <Row label="Escala" value={data.vaga.escala} />}
              {data.vaga.contratacao && <Row label="Modalidade" value={data.vaga.contratacao} />}
              {data.vaga.remuneracao != null && <Row label="Remuneração" value={brl(data.vaga.remuneracao, data.vaga.moeda)} />}
              {data.vaga.inicio && <Row label="Início previsto" value={data.vaga.inicio} />}
            </dl>

            <div className="mt-4 rounded-hm-sm bg-hm-primary-soft px-3 py-2.5">
              <p className="text-xs font-medium text-hm-primary">Por que essa vaga combina com você</p>
              <p className="mt-0.5 text-sm text-hm-text">
                Seu perfil tem aderência com os principais requisitos informados para esta oportunidade.
              </p>
            </div>
          </Card>

          {error && <p className="mt-3 text-sm text-hm-warning">{error}</p>}

          <button
            type="button"
            onClick={confirmar}
            disabled={confirming}
            className="btn-primary mt-5 w-full py-4 text-base font-semibold disabled:opacity-60"
          >
            {confirming ? 'Confirmando…' : 'Confirmar candidatura'}
          </button>
          <p className="mt-3 text-center text-xs text-hm-text-subtle">
            Ao confirmar, você demonstra interesse nesta vaga. Isso não garante contratação nem aprovação no processo.
          </p>
        </>
      )}
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-hm-md border border-hm-border-soft bg-hm-surface p-5 shadow-sm">{children}</div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-hm-border-soft pb-2 last:border-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wide text-hm-text-subtle">{label}</dt>
      <dd className="text-sm font-medium text-hm-text">{value}</dd>
    </div>
  );
}
