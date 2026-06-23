import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hm-bg px-4 text-center">
      <div className="mb-8">
        <Logo />
      </div>
      <p className="text-6xl font-bold text-hm-primary">404</p>
      <h1 className="mt-3 text-xl font-semibold text-hm-text">Página não encontrada</h1>
      <p className="mt-1 max-w-sm text-sm text-hm-text-muted">
        A página que você procura não existe ou foi movida.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Voltar ao painel
      </Link>
    </div>
  );
}
