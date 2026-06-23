'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

/** Hook simples de leitura: faz GET no path e expõe data/loading/error. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [path, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

export interface Paged<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
