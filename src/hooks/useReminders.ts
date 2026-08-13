import { useEffect, useState } from 'react';
import { sincronizarAvisos, type EstadoAvisos } from '@/data/notificationsRepo';
import { useAllNodes } from './useNodes';

const REBOTE_MS = 1_500;

export function useReminderSync(): EstadoAvisos | null {
  const nodos = useAllNodes();
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void sincronizarAvisos(nodos).then(setEstado);
    }, REBOTE_MS);

    return () => window.clearTimeout(id);
  }, [nodos]);

  return estado;
}
