import { describe, expect, it } from 'vitest';
import { isNewer, normalizeVersion } from './version';

describe('isNewer', () => {
  it('reconoce un salto de parche, menor y mayor', () => {
    expect(isNewer('1.0.1', '1.0.0')).toBe(true);
    expect(isNewer('1.1.0', '1.0.9')).toBe(true);
    expect(isNewer('2.0.0', '1.9.9')).toBe(true);
  });

  it('no considera nueva a la misma versión', () => {
    expect(isNewer('1.0.0', '1.0.0')).toBe(false);
  });

  it('no considera nueva a una versión anterior', () => {
    expect(isNewer('1.0.0', '1.0.1')).toBe(false);
    expect(isNewer('1.9.9', '2.0.0')).toBe(false);
  });

  it('tolera el prefijo v de las etiquetas de git', () => {
    expect(isNewer('v1.1.0', '1.0.0')).toBe(true);
    expect(isNewer('v1.0.0', 'v1.0.0')).toBe(false);
  });

  it('compara sin tener en cuenta el sufijo de precompilación', () => {
    expect(isNewer('1.1.0-rc1', '1.0.0')).toBe(true);
    expect(isNewer('1.0.0-rc1', '1.0.0')).toBe(false);
  });

  it('compara números, no texto', () => {
    expect(isNewer('1.10.0', '1.9.0')).toBe(true);
    expect(isNewer('1.9.0', '1.10.0')).toBe(false);
  });

  it('completa con ceros las versiones de distinta longitud', () => {
    expect(isNewer('1.0.1', '1.0')).toBe(true);
    expect(isNewer('1.0', '1.0.0')).toBe(false);
  });

  it('devuelve false ante entradas inválidas en vez de romperse', () => {
    expect(isNewer('no-es-una-version', '1.0.0')).toBe(false);
    expect(isNewer('1.0.0', '')).toBe(false);
    expect(isNewer('', '')).toBe(false);
    expect(isNewer('1.x.0', '1.0.0')).toBe(false);
  });
});

describe('normalizeVersion', () => {
  it('quita el prefijo v y los espacios', () => {
    expect(normalizeVersion(' v1.2.3 ')).toBe('1.2.3');
    expect(normalizeVersion('1.2.3')).toBe('1.2.3');
  });
});
