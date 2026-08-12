import { Link } from 'react-router';
import { formatHour } from '@/domain/calendarDay';
import { subtreeProgress } from '@/domain/progress';
import { formatRemaining, timeState } from '@/domain/time';
import type { TreeIndex } from '@/domain/tree';
import type { LuminaNode, Schedule } from '@/domain/types';
import { heightForRange, topForTime } from './TimelineGrid';

const TONOS: Record<string, string> = {
  upcoming: 'bg-surface-low border-l-primary/60 text-on-surface',
  calm: 'bg-primary/10 border-l-primary text-on-surface',
  amber: 'bg-amber-container border-l-amber text-on-amber-container',
  ended: 'bg-surface-low border-l-outline-variant text-on-surface-variant',
};

export interface EventBlockProps {
  node: LuminaNode;
  index: TreeIndex;
  now: Date;
}

export function EventBlock({ node, index, now }: EventBlockProps) {
  const schedule = node.schedule as Schedule;
  const estado = timeState(schedule, now);
  const progreso = subtreeProgress(index, node.id);

  return (
    <Link
      to={`/nodo/${node.id}`}
      data-time-state={estado}
      className={`absolute right-2 left-2 flex flex-col gap-1 overflow-hidden rounded-[length:var(--radius-md)] border-l-4 px-3 py-2 transition-colors duration-200 hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${TONOS[estado]}`}
      style={{ top: topForTime(schedule.start), height: heightForRange(schedule.start, schedule.end) }}
    >
      <span className="truncate text-[length:var(--text-label-md)] font-semibold">{node.text}</span>
      <span className="truncate text-[length:var(--text-label-sm)] opacity-80">
        {formatHour(schedule.start)} - {formatHour(schedule.end)}
        {progreso.total > 0 ? ` · ${progreso.done}/${progreso.total} tareas` : ''}
      </span>
      {estado === 'amber' ? (
        <span className="truncate text-[length:var(--text-label-sm)] font-medium">
          {formatRemaining(schedule, now)}
        </span>
      ) : null}
    </Link>
  );
}
