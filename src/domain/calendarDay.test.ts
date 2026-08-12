import { describe, expect, it } from 'vitest';
import { addDays, dayBounds, daysBetween, toCalendarDay } from './calendarDay';

describe('toCalendarDay', () => {
  it('formatea con ceros a la izquierda', () => {
    expect(toCalendarDay(new Date(2026, 0, 5, 13, 0))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('cruza el fin de mes', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('cruza el fin de año hacia atrás', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('respeta los años bisiestos', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('daysBetween', () => {
  it('cuenta días completos entre fechas', () => {
    expect(daysBetween('2026-08-01', '2026-08-12')).toBe(11);
  });

  it('devuelve negativo hacia atrás', () => {
    expect(daysBetween('2026-08-12', '2026-08-01')).toBe(-11);
  });

  it('no se rompe con el cambio de horario', () => {
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });
});

describe('dayBounds', () => {
  it('cubre exactamente 24 horas', () => {
    const { start, end } = dayBounds('2026-08-12');
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
  });
});
