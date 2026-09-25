import { useCallback } from 'react';
import { nodesRepo } from '@/data/nodesRepo';
import type { NodeId, Schedule } from '@/domain/types';

export function useMoverBloque(): (id: NodeId, minutos: number) => Promise<Schedule> {
  return useCallback((id: NodeId, minutos: number) => nodesRepo.shiftSchedule(id, minutos), []);
}
