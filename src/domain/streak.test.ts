import { describe, expect, it } from 'vitest';
import { addDays, toCalendarDay } from './calendarDay';
import { clarityStreak } from './streak';
import type { Activity } from './types';

const HOY = new Date(2026, 7, 12, 12, 0);
const HOY_DIA = toCalendarDay(HOY);

function actividadEn(dia: string): Activity {
  return { id: `a-${dia}`, type: 'complete', nodeId: 'n', at: `${dia}T09:00:00` };
}

function diasSeguidosHasta(dia: string, cantidad: number): Activity[] {
  return Array.from({ length: cantidad }, (_, i) => actividadEn(addDays(dia, -i)));
}

describe('clarityStreak', () => {
  it('devuelve cero sin actividad', () => {
    expect(clarityStreak([], HOY)).toEqual({ current: 0, longest: 0, forgivenessUsed: false });
  });

  it('cuenta días consecutivos terminando hoy sin marcar perdón', () => {
    const resultado = clarityStreak(diasSeguidosHasta(HOY_DIA, 3), HOY);
    expect(resultado.current).toBe(3);
    expect(resultado.forgivenessUsed).toBe(false);
  });

  it('no castiga que hoy todavía no tenga actividad', () => {
    expect(clarityStreak(diasSeguidosHasta(addDays(HOY_DIA, -1), 3), HOY).current).toBe(3);
  });

  it('sobrevive a un solo día perdido y lo marca', () => {
    const actividades = [
      ...diasSeguidosHasta(HOY_DIA, 2),
      ...diasSeguidosHasta(addDays(HOY_DIA, -3), 2),
    ];
    const resultado = clarityStreak(actividades, HOY);
    expect(resultado.current).toBe(4);
    expect(resultado.forgivenessUsed).toBe(true);
  });

  it('se corta con dos días perdidos seguidos', () => {
    const actividades = [
      ...diasSeguidosHasta(HOY_DIA, 2),
      ...diasSeguidosHasta(addDays(HOY_DIA, -4), 3),
    ];
    expect(clarityStreak(actividades, HOY).current).toBe(2);
  });

  it('solo perdona un día por ventana de siete', () => {
    const actividades = [
      actividadEn(HOY_DIA),
      actividadEn(addDays(HOY_DIA, -2)),
      actividadEn(addDays(HOY_DIA, -4)),
    ];
    expect(clarityStreak(actividades, HOY).current).toBe(2);
  });

  it('vuelve a perdonar cuando el perdón anterior queda fuera de la ventana', () => {
    const actividades = [
      ...diasSeguidosHasta(HOY_DIA, 2),
      ...diasSeguidosHasta(addDays(HOY_DIA, -3), 7),
      ...diasSeguidosHasta(addDays(HOY_DIA, -11), 2),
    ];
    expect(clarityStreak(actividades, HOY).current).toBe(11);
  });

  it('recuerda la racha más larga aunque la actual sea menor', () => {
    const actividades = [actividadEn(HOY_DIA), ...diasSeguidosHasta(addDays(HOY_DIA, -10), 6)];
    const resultado = clarityStreak(actividades, HOY);
    expect(resultado.current).toBe(1);
    expect(resultado.longest).toBeGreaterThanOrEqual(6);
  });

  it('cuenta una captura como día de claridad', () => {
    const captura: Activity = { id: 'c', type: 'capture', nodeId: 'n', at: `${HOY_DIA}T08:00:00` };
    expect(clarityStreak([captura], HOY).current).toBe(1);
  });

  it('no duplica el conteo con varias actividades el mismo día', () => {
    const actividades = [
      actividadEn(HOY_DIA),
      { ...actividadEn(HOY_DIA), id: 'otra', type: 'capture' as const },
    ];
    expect(clarityStreak(actividades, HOY).current).toBe(1);
  });
});
