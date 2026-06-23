import { Loading, ErrorState } from './ui';

export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  error,
  empty = 'Nenhum registro encontrado.',
}: {
  columns: Column<T>[];
  rows: T[] | null;
  loading?: boolean;
  error?: string | null;
  empty?: string;
}) {
  if (error) return <ErrorState message={error} />;
  if (loading || !rows) return <Loading />;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-hm-border bg-hm-surface-subtle text-left text-xs uppercase tracking-wide text-hm-text-subtle">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={`px-4 py-3 ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-hm-border-soft last:border-0 hover:bg-hm-surface-subtle">
              {columns.map((c, ci) => (
                <td key={ci} className={`px-4 py-3 ${c.className ?? ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-hm-text-subtle">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
