'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorState, LinkButton, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

interface Vacancy {
  id: string;
  code: string | null;
  title: string;
  status: string;
  priority: string;
  startsAt: string;
  endsAt: string;
  healthUnit?: { name: string };
}
interface Paged<T> {
  items: T[];
  meta: { total: number };
}

export default function VagasPage() {
  const [rows, setRows] = useState<Vacancy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Paged<Vacancy>>('/vacancies').then((r) => setRows(r.items)).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Vagas"
        subtitle="Plantões e oportunidades operacionais."
        action={<LinkButton href="/vagas/nova">+ Nova vaga</LinkButton>}
      />
      {error && <ErrorState message={error} />}
      {!rows && !error && <Loading />}
      {rows && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-hm-border bg-hm-surface-subtle text-left text-xs uppercase tracking-wide text-hm-text-subtle">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-b border-hm-border-soft last:border-0 hover:bg-hm-surface-subtle">
                  <td className="px-4 py-3 font-mono text-xs text-hm-text-muted">{v.code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/vagas/${v.id}`} className="font-medium text-hm-primary hover:underline">
                      {v.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-hm-text-muted">{v.healthUnit?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-hm-text-muted">
                    {new Date(v.startsAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-hm-text-subtle">
                    Nenhuma vaga cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
