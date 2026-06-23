'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorState, Loading, PageHeader, StatusBadge, LinkButton } from '@/components/ui';
import { api } from '@/lib/api';

interface Professional {
  id: string;
  fullName: string;
  professionalType: string;
  council: string | null;
  whatsapp: string;
  status: string;
  mainSpecialty?: { name: string } | null;
}
interface Paged<T> { items: T[]; }

export default function ProfissionaisPage() {
  const [rows, setRows] = useState<Professional[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Paged<Professional>>('/health-professionals').then((r) => setRows(r.items)).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <PageHeader title="Profissionais" subtitle="Banco de profissionais de saúde." action={<LinkButton href="/profissionais/novo">+ Novo profissional</LinkButton>} />
      {error && <ErrorState message={error} />}
      {!rows && !error && <Loading />}
      {rows && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-hm-border bg-hm-surface-subtle text-left text-xs uppercase tracking-wide text-hm-text-subtle">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Especialidade</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-hm-border-soft last:border-0 hover:bg-hm-surface-subtle">
                  <td className="px-4 py-3"><Link href={`/profissionais/${p.id}`} className="font-medium text-hm-primary hover:underline">{p.fullName}</Link></td>
                  <td className="px-4 py-3 text-hm-text-muted">{p.professionalType}</td>
                  <td className="px-4 py-3 text-hm-text-muted">{p.mainSpecialty?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-hm-text-muted">{p.whatsapp}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-hm-text-subtle">Nenhum profissional.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
