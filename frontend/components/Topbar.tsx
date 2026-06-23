'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Me {
  user: { fullName: string; role: string; email: string };
}

export function Topbar() {
  const router = useRouter();
  const [me, setMe] = useState<Me['user'] | null>(null);

  useEffect(() => {
    api
      .get<Me>('/users/me')
      .then((r) => setMe(r.user))
      .catch(() => setMe(null));
  }, []);

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    router.push('/login');
    router.refresh();
  }

  const initials =
    me?.fullName
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '–';

  return (
    <header
      className="flex items-center justify-end border-b border-hm-border bg-hm-surface px-6"
      style={{ height: '3.25rem' }}
    >
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-hm-text">{me?.fullName ?? '—'}</p>
          <p className="text-xs text-hm-text-subtle">
            {me?.role === 'ADMIN' ? 'Administrador' : me?.role ?? ''}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-hm-accent text-xs font-semibold text-white">
          {initials}
        </div>
        <button
          onClick={logout}
          title="Sair"
          className="ml-1 rounded-hm-sm p-1.5 text-hm-text-subtle hover:bg-hm-surface-muted hover:text-hm-danger"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
