import type { ReactNode } from 'react';

export const HOUR_HEIGHT_PX = 64;
export const MIN_BLOCK_PX = 24;
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 23;

export function topForTime(iso: string, dayStartHour = DAY_START_HOUR): number {
  const fecha = new Date(iso);
  const horas = fecha.getHours() + fecha.getMinutes() / 60 - dayStartHour;
  return horas * HOUR_HEIGHT_PX;
}

export function heightForRange(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(MIN_BLOCK_PX, (ms / 3_600_000) * HOUR_HEIGHT_PX);
}

export function horasVisibles(): number[] {
  return Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
}

function etiquetaHora(hora: number): string {
  return `${`${hora}`.padStart(2, '0')}:00`;
}

export function TimelineGrid({ children }: { children: ReactNode }) {
  const horas = horasVisibles();

  return (
    <div className="relative flex" style={{ height: horas.length * HOUR_HEIGHT_PX }}>
      <div className="w-16 shrink-0 border-r border-outline-variant/40">
        {horas.map((hora) => (
          <div key={hora} className="relative" style={{ height: HOUR_HEIGHT_PX }}>
            <span className="absolute -top-2 right-3 text-[length:var(--text-label-sm)] tabular-nums text-on-surface-variant/70">
              {etiquetaHora(hora)}
            </span>
          </div>
        ))}
      </div>

      <div className="relative flex-1">
        {horas.map((hora) => (
          <div
            key={hora}
            className="border-t border-outline-variant/25"
            style={{ height: HOUR_HEIGHT_PX }}
          />
        ))}
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}
