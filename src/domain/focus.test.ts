import { describe, expect, it } from 'vitest';
import { buildNode } from '@/test/factories';
import { nextPendingTask, pendingCount } from './focus';
import { indexNodes } from './tree';

describe('nextPendingTask', () => {
  it('devuelve la primera hoja pendiente en orden', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', order: 'U', done: true }),
      buildNode({ id: 'b', parentId: 'r', order: 'k' }),
    ];
    expect(nextPendingTask(indexNodes(nodos), 'r')?.id).toBe('b');
  });

  it('desciende a las subtareas antes de pasar al siguiente hermano', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', order: 'U' }),
      buildNode({ id: 'a1', parentId: 'a', order: 'U' }),
      buildNode({ id: 'b', parentId: 'r', order: 'k' }),
    ];
    expect(nextPendingTask(indexNodes(nodos), 'r')?.id).toBe('a');
  });

  it('salta un padre completado y entra a su subtarea pendiente', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', order: 'U', done: true }),
      buildNode({ id: 'a1', parentId: 'a', order: 'U' }),
      buildNode({ id: 'b', parentId: 'r', order: 'k' }),
    ];
    expect(nextPendingTask(indexNodes(nodos), 'r')?.id).toBe('a1');
  });

  it('devuelve null cuando todo está completado', () => {
    const nodos = [buildNode({ id: 'r' }), buildNode({ id: 'a', parentId: 'r', done: true })];
    expect(nextPendingTask(indexNodes(nodos), 'r')).toBeNull();
  });

  it('devuelve null si la raíz no existe', () => {
    expect(nextPendingTask(indexNodes([]), 'fantasma')).toBeNull();
  });
});

describe('pendingCount', () => {
  it('cuenta las tareas pendientes del subárbol', () => {
    const nodos = [
      buildNode({ id: 'r' }),
      buildNode({ id: 'a', parentId: 'r', done: true }),
      buildNode({ id: 'b', parentId: 'r' }),
      buildNode({ id: 'b1', parentId: 'b' }),
    ];
    expect(pendingCount(indexNodes(nodos), 'r')).toBe(2);
  });
});
