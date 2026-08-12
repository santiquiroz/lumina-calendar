import { addDays, daysBetween, toCalendarDay, type CalendarDay } from './calendarDay';
import type { Activity } from './types';

export const FORGIVENESS_WINDOW_DAYS = 7;
const LIMITE_RETROCESO_DIAS = 3650;

export interface StreakResult {
  current: number;
  longest: number;
  forgivenessUsed: boolean;
}

export const RACHA_VACIA: StreakResult = { current: 0, longest: 0, forgivenessUsed: false };

export function clarityDays(activities: Activity[]): Set<CalendarDay> {
  return new Set(activities.map((a) => toCalendarDay(a.at)));
}

interface Conteo {
  largo: number;
  perdonUsado: boolean;
}

// Cuenta hacia atrás desde `inicio`. Un día sin actividad se "perdona" solo si
// la racha continúa después de él y no se usó otro perdón en los 7 días previos.
function contarDesde(dias: Set<CalendarDay>, inicio: CalendarDay): Conteo {
  let cursor = inicio;
  let largo = 0;
  let perdonUsado = false;
  let perdonPendiente: CalendarDay | null = null;
  let ultimoPerdon: CalendarDay | null = null;

  for (let paso = 0; paso < LIMITE_RETROCESO_DIAS; paso += 1) {
    if (dias.has(cursor)) {
      if (perdonPendiente !== null) {
        ultimoPerdon = perdonPendiente;
        perdonPendiente = null;
        perdonUsado = true;
      }
      largo += 1;
    } else {
      if (perdonPendiente !== null) break;
      const disponible =
        ultimoPerdon === null || daysBetween(cursor, ultimoPerdon) >= FORGIVENESS_WINDOW_DAYS;
      if (!disponible) break;
      perdonPendiente = cursor;
    }
    cursor = addDays(cursor, -1);
  }

  return { largo, perdonUsado };
}

export function clarityStreak(activities: Activity[], today: Date): StreakResult {
  const dias = clarityDays(activities);
  if (dias.size === 0) return RACHA_VACIA;

  const hoy = toCalendarDay(today);
  const arranque = dias.has(hoy) ? hoy : addDays(hoy, -1);
  const actual = contarDesde(dias, arranque);

  const longest = [...dias].reduce(
    (maximo, dia) => Math.max(maximo, contarDesde(dias, dia).largo),
    0,
  );

  return {
    current: actual.largo,
    longest: Math.max(longest, actual.largo),
    forgivenessUsed: actual.perdonUsado,
  };
}
