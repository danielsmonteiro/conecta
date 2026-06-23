/** Converte ISO → valor de <input type="datetime-local"> (hora local). */
export function toDateTimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/** Converte ISO → valor de <input type="date">. */
export function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}
