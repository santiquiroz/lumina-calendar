import { describe, expect, it } from 'vitest';
import { orderBetween } from './order';

describe('orderBetween', () => {
  it('genera una clave cuando no hay vecinos', () => {
    expect(orderBetween(null, null).length).toBeGreaterThan(0);
  });

  it('genera una clave estrictamente entre dos vecinos', () => {
    const a = orderBetween(null, null);
    const c = orderBetween(a, null);
    const b = orderBetween(a, c);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it('genera una clave anterior a la primera', () => {
    const first = orderBetween(null, null);
    expect(orderBetween(null, first) < first).toBe(true);
  });

  it('mantiene el orden tras 200 inserciones consecutivas al inicio', () => {
    const keys: string[] = [orderBetween(null, null)];
    for (let i = 0; i < 200; i += 1) {
      keys.unshift(orderBetween(null, keys[0]));
    }
    expect(keys).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('mantiene el orden tras 200 inserciones consecutivas en el medio', () => {
    let izquierda = orderBetween(null, null);
    const derecha = orderBetween(izquierda, null);
    const generadas: string[] = [];
    for (let i = 0; i < 200; i += 1) {
      const nueva = orderBetween(izquierda, derecha);
      expect(izquierda < nueva).toBe(true);
      expect(nueva < derecha).toBe(true);
      generadas.push(nueva);
      izquierda = nueva;
    }
    expect(new Set(generadas).size).toBe(generadas.length);
  });

  it('rechaza límites invertidos', () => {
    const a = orderBetween(null, null);
    const b = orderBetween(a, null);
    expect(() => orderBetween(b, a)).toThrow(RangeError);
  });

  it('rechaza caracteres fuera del alfabeto', () => {
    expect(() => orderBetween('ñ', null)).toThrow(RangeError);
  });
});
