import { describe, expect, it } from 'vitest';
import { buildNode } from '@/test/factories';
import { isSubtreeComplete, subtreeProgress } from './progress';
import { indexNodes } from './tree';

describe('subtreeProgress', () => {
  it('devuelve cero para un nodo sin descendientes', () => {
    expect(subtreeProgress(indexNodes([buildNode({ id: 'solo' })]), 'solo')).toEqual({
      done: 0,
      total: 0,
      ratio: 0,
    });
  });

  it('cuenta todos los descendientes, no solo los hijos directos', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', done: true }),
      buildNode({ id: 'a1', parentId: 'a', done: true }),
      buildNode({ id: 'a2', parentId: 'a', done: false }),
      buildNode({ id: 'b', parentId: 'r', done: false }),
    ];
    expect(subtreeProgress(indexNodes(nodos), 'r')).toEqual({ done: 2, total: 4, ratio: 0.5 });
  });

  it('no cuenta la propia raíz aunque esté completada', () => {
    const nodos = [
      buildNode({ id: 'r', done: true }),
      buildNode({ id: 'h', parentId: 'r', done: false }),
    ];
    expect(subtreeProgress(indexNodes(nodos), 'r')).toEqual({ done: 0, total: 1, ratio: 0 });
  });

  it('ignora los descendientes borrados', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'vivo', parentId: 'r', done: true }),
      buildNode({ id: 'muerto', parentId: 'r', deletedAt: '2026-08-12T10:00:00.000Z' }),
    ];
    expect(subtreeProgress(indexNodes(nodos), 'r')).toEqual({ done: 1, total: 1, ratio: 1 });
  });
});

describe('isSubtreeComplete', () => {
  it('un subárbol vacío no cuenta como completado', () => {
    expect(isSubtreeComplete({ done: 0, total: 0, ratio: 0 })).toBe(false);
  });

  it('reconoce el subárbol completo', () => {
    expect(isSubtreeComplete({ done: 3, total: 3, ratio: 1 })).toBe(true);
  });

  it('no reconoce uno parcial', () => {
    expect(isSubtreeComplete({ done: 2, total: 3, ratio: 2 / 3 })).toBe(false);
  });
});
