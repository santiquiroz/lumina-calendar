import { descendantsOf, type TreeIndex } from './tree';
import type { NodeId } from './types';

export interface Progress {
  done: number;
  total: number;
  ratio: number;
}

export const PROGRESO_VACIO: Progress = { done: 0, total: 0, ratio: 0 };

export function subtreeProgress(index: TreeIndex, rootId: NodeId): Progress {
  const descendientes = descendantsOf(index, rootId);
  const total = descendientes.length;
  const done = descendientes.filter((n) => n.done).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

export function isSubtreeComplete(progress: Progress): boolean {
  return progress.total > 0 && progress.done === progress.total;
}
