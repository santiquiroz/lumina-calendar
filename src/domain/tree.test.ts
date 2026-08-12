import { describe, expect, it } from 'vitest';
import { buildChain, buildNode } from '@/test/factories';
import { DomainError } from './errors';
import {
  MAX_DEPTH,
  ancestorsOf,
  assertMoveAllowed,
  depthOf,
  descendantsOf,
  indexNodes,
  isDescendant,
  subtreeHeight,
} from './tree';

describe('indexNodes', () => {
  it('agrupa los hijos por padre y ordena por la clave de orden', () => {
    const padre = buildNode({ id: 'p' });
    const b = buildNode({ id: 'b', parentId: 'p', order: 'k' });
    const a = buildNode({ id: 'a', parentId: 'p', order: 'U' });
    const index = indexNodes([padre, b, a]);
    expect(index.childrenOf('p').map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('excluye los nodos borrados', () => {
    const padre = buildNode({ id: 'p' });
    const hijo = buildNode({ id: 'h', parentId: 'p', deletedAt: '2026-08-12T10:00:00.000Z' });
    const index = indexNodes([padre, hijo]);
    expect(index.childrenOf('p')).toEqual([]);
    expect(index.byId.has('h')).toBe(false);
  });

  it('expone las raíces', () => {
    const raiz = buildNode({ id: 'r' });
    const hijo = buildNode({ id: 'h', parentId: 'r' });
    expect(
      indexNodes([raiz, hijo])
        .roots()
        .map((n) => n.id),
    ).toEqual(['r']);
  });

  it('trata como raíz a un nodo cuyo padre ya no existe', () => {
    const huerfano = buildNode({ id: 'h', parentId: 'desaparecido' });
    expect(
      indexNodes([huerfano])
        .roots()
        .map((n) => n.id),
    ).toEqual(['h']);
  });
});

describe('depthOf', () => {
  it('asigna profundidad 0 a la raíz', () => {
    expect(depthOf(indexNodes(buildChain(1)), 'c0')).toBe(0);
  });

  it('cuenta un nivel por ancestro', () => {
    expect(depthOf(indexNodes(buildChain(4)), 'c3')).toBe(3);
  });

  it('lanza NOT_FOUND si el nodo no existe', () => {
    expect(() => depthOf(indexNodes([]), 'inexistente')).toThrow(DomainError);
  });
});

describe('ancestorsOf', () => {
  it('devuelve la cadena desde la raíz hasta el padre', () => {
    const index = indexNodes(buildChain(4));
    expect(ancestorsOf(index, 'c3').map((n) => n.id)).toEqual(['c0', 'c1', 'c2']);
  });

  it('devuelve vacío para una raíz', () => {
    expect(ancestorsOf(indexNodes(buildChain(2)), 'c0')).toEqual([]);
  });
});

describe('descendantsOf y subtreeHeight', () => {
  it('devuelve todos los descendientes en profundidad', () => {
    expect(descendantsOf(indexNodes(buildChain(4)), 'c0').map((n) => n.id)).toEqual([
      'c1',
      'c2',
      'c3',
    ]);
  });

  it('recorre en profundidad antes que en anchura', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', order: 'U' }),
      buildNode({ id: 'a1', parentId: 'a', order: 'U' }),
      buildNode({ id: 'b', parentId: 'r', order: 'k' }),
    ];
    expect(descendantsOf(indexNodes(nodos), 'r').map((n) => n.id)).toEqual(['a', 'a1', 'b']);
  });

  it('devuelve lista vacía para una hoja', () => {
    expect(descendantsOf(indexNodes(buildChain(2)), 'c1')).toEqual([]);
  });

  it('mide la altura del subárbol', () => {
    const index = indexNodes(buildChain(4));
    expect(subtreeHeight(index, 'c0')).toBe(3);
    expect(subtreeHeight(index, 'c3')).toBe(0);
  });
});

describe('isDescendant', () => {
  it('reconoce a un descendiente lejano', () => {
    expect(isDescendant(indexNodes(buildChain(4)), 'c3', 'c0')).toBe(true);
  });

  it('no considera descendiente a un ancestro', () => {
    expect(isDescendant(indexNodes(buildChain(4)), 'c0', 'c3')).toBe(false);
  });

  it('no considera descendiente a sí mismo', () => {
    expect(isDescendant(indexNodes(buildChain(2)), 'c1', 'c1')).toBe(false);
  });
});

describe('assertMoveAllowed', () => {
  it('permite mover a la raíz', () => {
    expect(() => assertMoveAllowed(indexNodes(buildChain(3)), 'c2', null)).not.toThrow();
  });

  it('rechaza mover un nodo dentro de su propio subárbol', () => {
    expect(() => assertMoveAllowed(indexNodes(buildChain(3)), 'c0', 'c2')).toThrow(
      expect.objectContaining({ code: 'CYCLE' }),
    );
  });

  it('rechaza mover un nodo sobre sí mismo', () => {
    expect(() => assertMoveAllowed(indexNodes(buildChain(2)), 'c1', 'c1')).toThrow(
      expect.objectContaining({ code: 'CYCLE' }),
    );
  });

  it(`permite un movimiento que deja el subárbol exactamente en ${MAX_DEPTH} niveles`, () => {
    const index = indexNodes([...buildChain(MAX_DEPTH + 1), buildNode({ id: 'suelto' })]);
    expect(() => assertMoveAllowed(index, 'suelto', `c${MAX_DEPTH - 1}`)).not.toThrow();
  });

  it(`rechaza un movimiento que supera ${MAX_DEPTH} niveles`, () => {
    const index = indexNodes([...buildChain(MAX_DEPTH + 1), buildNode({ id: 'suelto' })]);
    expect(() => assertMoveAllowed(index, 'suelto', `c${MAX_DEPTH}`)).toThrow(
      expect.objectContaining({ code: 'MAX_DEPTH' }),
    );
  });

  it('cuenta la altura del subárbol movido, no solo el nodo', () => {
    const index = indexNodes([
      ...buildChain(MAX_DEPTH - 1),
      buildNode({ id: 's0' }),
      buildNode({ id: 's1', parentId: 's0' }),
      buildNode({ id: 's2', parentId: 's1' }),
    ]);
    expect(() => assertMoveAllowed(index, 's0', `c${MAX_DEPTH - 2}`)).toThrow(
      expect.objectContaining({ code: 'MAX_DEPTH' }),
    );
  });

  it('lanza NOT_FOUND si el nodo movido no existe', () => {
    expect(() => assertMoveAllowed(indexNodes([]), 'fantasma', null)).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });
});
