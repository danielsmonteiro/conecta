import Link from 'next/link';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-hm-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-hm-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm text-hm-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-hm-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-hm-text-subtle">{hint}</p>}
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-hm-text">{title}</h2>
      {children}
    </div>
  );
}

export function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn-primary">
      {children}
    </Link>
  );
}

export function formatBRL(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value || 0);
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: 'bg-hm-success-soft text-hm-success',
    ACTIVE: 'bg-hm-success-soft text-hm-success',
    CONFIRMED: 'bg-hm-success-soft text-hm-success',
    APPROVED: 'bg-hm-success-soft text-hm-success',
    DRAFT: 'bg-hm-surface-muted text-hm-text-muted',
    PENDING: 'bg-hm-warning-soft text-hm-warning',
    IN_REVIEW: 'bg-hm-warning-soft text-hm-warning',
    MATCHING: 'bg-hm-info-soft text-hm-info',
    CANCELLED: 'bg-hm-danger-soft text-hm-danger',
    REJECTED: 'bg-hm-danger-soft text-hm-danger',
    INCOMPLETE: 'bg-hm-warning-soft text-hm-warning',
  };
  const cls = map[status] ?? 'bg-hm-surface-muted text-hm-text-muted';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-hm-text-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium text-hm-text">{value ?? '—'}</dd>
    </div>
  );
}

export function Loading() {
  return <div className="py-10 text-center text-sm text-hm-text-subtle">Carregando…</div>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-hm-md bg-hm-danger-soft px-4 py-3 text-sm text-hm-danger">{message}</div>
  );
}
