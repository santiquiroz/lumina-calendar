import type { Schedule } from './types';

export type TimeState = 'upcoming' | 'calm' | 'amber' | 'ended';

export const AMBER_RATIO = 0.2;
export const AMBER_MIN_MS = 60_000;
export const AMBER_MAX_MS = 15 * 60_000;

export function amberThresholdMs(durationMs: number): number {
  const relativo = durationMs * AMBER_RATIO;
  return Math.min(Math.max(relativo, AMBER_MIN_MS), AMBER_MAX_MS);
}

export function durationMs(schedule: Schedule): number {
  return Math.max(0, new Date(schedule.end).getTime() - new Date(schedule.start).getTime());
}

export function remainingMs(schedule: Schedule, now: Date): number {
  return Math.max(0, new Date(schedule.end).getTime() - now.getTime());
}

export function remainingRatio(schedule: Schedule, now: Date): number {
  const total = durationMs(schedule);
  if (total === 0) return 0;
  return Math.min(1, remainingMs(schedule, now) / total);
}

export function timeState(schedule: Schedule, now: Date): TimeState {
  const ahora = now.getTime();
  const inicio = new Date(schedule.start).getTime();
  const fin = new Date(schedule.end).getTime();

  if (ahora < inicio) return 'upcoming';
  if (ahora >= fin) return 'ended';
  if (schedule.allDay) return 'calm';

  return fin - ahora <= amberThresholdMs(fin - inicio) ? 'amber' : 'calm';
}

export function formatRemaining(schedule: Schedule, now: Date): string {
  const restante = remainingMs(schedule, now);
  if (restante === 0) return 'Terminado';

  const minutos = Math.ceil(restante / 60_000);
  if (minutos < 60) return `${minutos} min restantes`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h restantes` : `${horas} h ${resto} min restantes`;
}
