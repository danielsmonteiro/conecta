'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorState, Loading, PageHeader, StatusBadge, LinkButton } from '@/components/ui';
import { api } from '@/lib/api';

interface Contract {
  id: string;
  code: string | null;
  name: string;
  type: string;
  status: string;
  healthUnit?: { name: string };
}
interface Paged<T> { items: T[]; }

export default function ContratosPage() {
  const [rows, setRows] = useState<Contract[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Paged<Contract>>('/contracts').then((r) => setRows(r.items)).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader title="Contratos" subtitle="Contratos ativos e seus parâmetros." action={<LinkButton href="/contratos/novo">+ Novo contrato</LinkButton>} />
      {error && <ErrorState message={error} />}
      {!rows && !error && <Loading />}
      {rows && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-hm-border bg-hm-surface-subtle text-left text-xs uppercase tracking-wide text-hm-text-subtle">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-hm-border-soft last:border-0 hover:bg-hm-surface-subtle">
                  <td className="px-4 py-3 font-mono text-xs text-hm-text-muted">{c.code ?? '—'}</td>
                  <td className="px-4 py-3"><Link href={`/contratos/${c.id}`} className="font-medium text-hm-primary hover:underline">{c.name}</Link></td>
                  <td className="px-4 py-3 text-hm-text-muted">{c.type}</td>
                  <td className="px-4 py-3 text-hm-text-muted">{c.healthUnit?.name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-hm-text-subtle">Nenhum contrato.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
