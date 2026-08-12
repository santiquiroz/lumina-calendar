import { descendantsOf, type TreeIndex } from './tree';
import type { LuminaNode, NodeId } from './types';

export function nextPendingTask(index: TreeIndex, rootId: NodeId): LuminaNode | null {
  if (!index.byId.has(rootId)) return null;
  return descendantsOf(index, rootId).find((nodo) => !nodo.done) ?? null;
}

export function pendingCount(index: TreeIndex, rootId: NodeId): number {
  if (!index.byId.has(rootId)) return 0;
  return descendantsOf(index, rootId).filter((nodo) => !nodo.done).length;
}
