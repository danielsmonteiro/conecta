'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Logo } from '@/components/Logo';
import { api, ApiError } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/login', { email, password });
      router.push(params.get('next') || '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hm-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-hm-lg border border-hm-border bg-hm-surface p-7 shadow-hm-card">
          <h1 className="text-xl font-semibold text-hm-text">Entrar</h1>
          <p className="mt-1 text-sm text-hm-text-muted">
            Acesse o painel operacional do HealthMatch.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="E-mail">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="input"
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </Field>

            {error && (
              <div className="rounded-hm-sm bg-hm-danger-soft px-3 py-2 text-sm text-hm-danger">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-hm-text">{label}</span>
      {children}
    </label>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
