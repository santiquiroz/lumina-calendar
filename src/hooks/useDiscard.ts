import { useCallback } from 'react';
import { nodesRepo } from '@/data/nodesRepo';
import type { NodeId } from '@/domain/types';
import { useUiStore } from '@/store/uiStore';

export function useDescartar(): (id: NodeId, mensaje: string) => Promise<void> {
  const avisarDescarte = useUiStore((estado) => estado.avisarDescarte);

  return useCallback(
    async (id: NodeId, mensaje: string) => {
      await nodesRepo.softDelete(id);
      avisarDescarte(id, mensaje);
    },
    [avisarDescarte],
  );
}

export function useDeshacerDescarte(): (id: NodeId) => Promise<void> {
  const cerrarDescarte = useUiStore((estado) => estado.cerrarDescarte);

  return useCallback(
    async (id: NodeId) => {
      await nodesRepo.restore(id);
      cerrarDescarte();
    },
    [cerrarDescarte],
  );
}
