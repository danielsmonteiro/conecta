export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-hm-md bg-hm-primary text-lg font-bold text-white">
        H
      </div>
      <span className={`text-lg font-semibold ${light ? 'text-white' : 'text-hm-text'}`}>
        HealthMatch
      </span>
    </div>
  );
}
