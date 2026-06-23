/**
 * Cliente HTTP do frontend. Usa caminhos relativos `/api/*` (proxy do Next para
 * o backend) com cookies httpOnly. Em 401, tenta `/api/auth/refresh` uma vez e
 * repete a requisição — mesmo comportamento observado na produção.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function raw(path: string, init: RequestInit): Promise<Response> {
  return fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await raw(path, init);

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    const refreshed = await raw('/auth/refresh', { method: 'POST' });
    if (refreshed.ok) {
      res = await raw(path, init); // repete a request original
    }
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    const message =
      (body as any)?.message?.toString?.() || `Erro ${res.status} em ${path}`;
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
