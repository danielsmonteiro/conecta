import { EventEmitter } from 'events';

/**
 * Barramento de eventos de domínio em processo (Node EventEmitter), usado para
 * desacoplar o PrismaService (que publica) do ConnectorEventsService (que entrega
 * aos parceiros) — evita dependência circular. Best-effort, não persistente.
 */
export const domainEvents = new EventEmitter();
domainEvents.setMaxListeners(50);

export type DomainEventType =
  | 'application.created'
  | 'application.status_changed'
  | 'vacancy.status_changed';

export function publishDomainEvent(type: DomainEventType, payload: any) {
  // nunca deixar um erro de listener quebrar a transação de origem
  try {
    domainEvents.emit(type, payload);
  } catch {
    /* ignore */
  }
}
