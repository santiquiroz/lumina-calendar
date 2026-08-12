import type { Progress } from '@/domain/progress';
import { formatRemaining, remainingRatio, timeState } from '@/domain/time';
import type { Schedule } from '@/domain/types';
import { ProgressBar } from './ProgressBar';

export interface DualProgressProps {
  progreso: Progress;
  schedule: Schedule | null;
  now: Date;
}

export function DualProgress({ progreso, schedule, now }: DualProgressProps) {
  const estado = schedule ? timeState(schedule, now) : null;

  return (
    <div className="flex flex-col gap-3">
      {progreso.total > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[length:var(--text-label-md)] text-on-surface-variant">
            <span>Progreso de tareas</span>
            <span className="tabular-nums">
              {progreso.done}/{progreso.total}
            </span>
          </div>
          <ProgressBar value={progreso.ratio} label="Progreso de tareas" />
        </div>
      ) : null}

      {schedule ? (
        <div className="flex flex-col gap-1">
          <div
            data-time-state={estado}
            className={`flex items-center justify-between text-[length:var(--text-label-md)] ${
              estado === 'amber' ? 'font-semibold text-amber' : 'text-on-surface-variant'
            }`}
          >
            <span>Tiempo restante</span>
            <span>{formatRemaining(schedule, now)}</span>
          </div>
          <ProgressBar
            value={remainingRatio(schedule, now)}
            label="Tiempo restante"
            tone={estado === 'amber' ? 'amber' : 'primary'}
          />
        </div>
      ) : null}
    </div>
  );
}
