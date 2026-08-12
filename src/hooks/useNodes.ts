import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/data/db';
import { nodesRepo } from '@/data/nodesRepo';
import type { CalendarDay } from '@/domain/calendarDay';
import { PROGRESO_VACIO, subtreeProgress, type Progress } from '@/domain/progress';
import { ancestorsOf, descendantsOf, indexNodes, type TreeIndex } from '@/domain/tree';
import type { LuminaNode, NodeId } from '@/domain/types';

const SIN_NODOS: LuminaNode[] = [];

export function useAllNodes(): LuminaNode[] {
  return useLiveQuery(() => db.nodes.toArray(), [], SIN_NODOS);
}

export function useTreeIndex(): TreeIndex {
  const nodes = useAllNodes();
  return useMemo(() => indexNodes(nodes), [nodes]);
}

export function useDayNodes(day: CalendarDay): LuminaNode[] {
  return useLiveQuery(() => nodesRepo.listByDay(day), [day], SIN_NODOS);
}

export function useIdeas(): LuminaNode[] {
  return useLiveQuery(() => nodesRepo.listIdeas(), [], SIN_NODOS);
}

export function useNode(id: NodeId | undefined): LuminaNode | undefined {
  const index = useTreeIndex();
  return id === undefined ? undefined : index.byId.get(id);
}

export function useSubtree(rootId: NodeId | undefined): LuminaNode[] {
  const index = useTreeIndex();
  return useMemo(
    () => (rootId !== undefined && index.byId.has(rootId) ? descendantsOf(index, rootId) : []),
    [index, rootId],
  );
}

export function useAncestors(id: NodeId | undefined): LuminaNode[] {
  const index = useTreeIndex();
  return useMemo(
    () => (id !== undefined && index.byId.has(id) ? ancestorsOf(index, id) : []),
    [index, id],
  );
}

export function useProgress(rootId: NodeId | undefined): Progress {
  const index = useTreeIndex();
  return useMemo(
    () =>
      rootId !== undefined && index.byId.has(rootId)
        ? subtreeProgress(index, rootId)
        : PROGRESO_VACIO,
    [index, rootId],
  );
}

export function useSearch(query: string): LuminaNode[] {
  return useLiveQuery(() => nodesRepo.search(query), [query], SIN_NODOS);
}
