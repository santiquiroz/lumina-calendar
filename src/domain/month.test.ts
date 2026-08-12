import { describe, expect, it } from 'vitest';
import { belongsToMonth, monthGrid } from './month';

describe('monthGrid', () => {
  it('siempre devuelve seis semanas de siete días', () => {
    const grid = monthGrid(2026, 7);
    expect(grid).toHaveLength(6);
    for (const semana of grid) expect(semana).toHaveLength(7);
  });

  it('empieza en el domingo anterior o igual al día 1', () => {
    expect(monthGrid(2023, 8)[0][0]).toBe('2023-08-27');
  });

  it('incluye todos los días del mes pedido', () => {
    const dias = monthGrid(2026, 1).flat();
    expect(dias).toContain('2026-02-01');
    expect(dias).toContain('2026-02-28');
  });

  it('encadena días consecutivos sin huecos', () => {
    const dias = monthGrid(2026, 11).flat();
    for (let i = 1; i < dias.length; i += 1) {
      const previo = new Date(dias[i - 1]).getTime();
      const actual = new Date(dias[i]).getTime();
      expect(actual - previo).toBe(86_400_000);
    }
  });
});

describe('belongsToMonth', () => {
  it('reconoce los días del mes pedido', () => {
    expect(belongsToMonth('2026-08-12', 2026, 7)).toBe(true);
  });

  it('descarta el desborde del mes vecino', () => {
    expect(belongsToMonth('2026-09-01', 2026, 7)).toBe(false);
  });
});
