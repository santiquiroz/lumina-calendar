import type { ReactNode } from 'react';
import type { EventColorKey } from '@/domain/types';

export interface ChipProps {
  children: ReactNode;
  colorKey?: EventColorKey | null;
}

const BORDES: Record<EventColorKey, string> = {
  indigo: 'border-l-event-indigo',
  teal: 'border-l-event-teal',
  rose: 'border-l-event-rose',
  amber: 'border-l-event-amber',
  slate: 'border-l-event-slate',
};

export function Chip({ children, colorKey = null }: ChipProps) {
  const borde = colorKey ? `border-l-4 ${BORDES[colorKey]}` : '';
  return (
    <span
      className={`inline-flex items-center rounded-full bg-surface-mid px-3 py-1 text-[length:var(--text-label-sm)] font-medium text-on-surface-variant ${borde}`}
    >
      {children}
    </span>
  );
}
