'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorState, Loading, PageHeader, StatusBadge, LinkButton } from '@/components/ui';
import { api } from '@/lib/api';

interface Organization {
  id: string;
  name: string;
  type: string;
  status: string;
  email: string | null;
}
interface Paged<T> { items: T[]; }

export default function OrganizacoesPage() {
  const [rows, setRows] = useState<Organization[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Paged<Organization>>('/organizations').then((r) => setRows(r.items)).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader title="Organizações" subtitle="Instituições e parceiros." action={<LinkButton href="/organizacoes/nova">+ Nova organização</LinkButton>} />
      {error && <ErrorState message={error} />}
      {!rows && !error && <Loading />}
      {rows && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-hm-border bg-hm-surface-subtle text-left text-xs uppercase tracking-wide text-hm-text-subtle">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-hm-border-soft last:border-0 hover:bg-hm-surface-subtle">
                  <td className="px-4 py-3"><Link href={`/organizacoes/${o.id}`} className="font-medium text-hm-primary hover:underline">{o.name}</Link></td>
                  <td className="px-4 py-3 text-hm-text-muted">{o.type}</td>
                  <td className="px-4 py-3 text-hm-text-muted">{o.email ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-hm-text-subtle">Nenhuma organização.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
