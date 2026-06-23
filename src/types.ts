export interface ApiCall {
  /** Metodo HTTP. */
  method: string;
  /** URL completa (com query). */
  url: string;
  /** origin + pathname (sem query). */
  endpoint: string;
  /** path com IDs substituidos por :id / :uuid. */
  template: string;
  resourceType: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  status: number | null;
  statusText: string | null;
  responseHeaders: Record<string, string>;
  responseContentType: string | null;
  responseSample: unknown;
  /** Rota do app em que a chamada foi observada. */
  observedOn: string;
  timestamp: string;
}

export interface VisitedRoute {
  url: string;
  routeKey: string;
  title: string;
  depth: number;
  status: 'ok' | 'error' | 'skipped';
  screenshot?: string;
  html?: string;
  discoveredLinks: number;
  note?: string;
}

export interface SkippedItem {
  url?: string;
  reason: string;
  context?: string;
}

export interface AssetRecord {
  url: string;
  type: string;
  savedAs: string | null;
  status: number | null;
  bytes: number | null;
  error?: string;
}

export interface RecoverySummary {
  startedAt: string;
  finishedAt: string;
  loginSucceeded: boolean;
  origin: string;
  routesVisited: number;
  apiEndpoints: number;
  apiCalls: number;
  screenshots: number;
  assets: number;
  skipped: number;
}
