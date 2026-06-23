export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-hm-text">{label}</span>
      {children}
    </label>
  );
}

export function FormActions({
  onCancel,
  saving,
  submitLabel = 'Salvar',
}: {
  onCancel: () => void;
  saving: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-hm-border-soft pt-4">
      <button type="button" className="btn-ghost" onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Salvando…' : submitLabel}
      </button>
    </div>
  );
}
