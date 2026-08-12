export interface ProgressBarProps {
  value: number;
  label: string;
  tone?: 'primary' | 'amber';
}

export function ProgressBar({ value, label, tone = 'primary' }: ProgressBarProps) {
  const porcentaje = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-mid"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${
          tone === 'amber' ? 'bg-amber' : 'bg-primary'
        }`}
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}
