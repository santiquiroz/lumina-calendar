import { useCallback, useEffect, useState } from 'react';
import { currentAppVersion } from '@/data/appVersion';
import { checkForUpdate, dismissUpdate, type UpdateInfo } from '@/data/updateRepo';

export type EstadoChequeo = 'inactivo' | 'buscando' | 'al-dia' | 'hay-version' | 'sin-red';

export interface UseUpdate {
  disponible: UpdateInfo | null;
  estado: EstadoChequeo;
  versionInstalada: string;
  buscar(): Promise<void>;
  descartar(): Promise<void>;
}

export function useUpdate(automatico = true): UseUpdate {
  const [disponible, setDisponible] = useState<UpdateInfo | null>(null);
  const [estado, setEstado] = useState<EstadoChequeo>('inactivo');
  const [versionInstalada, setVersionInstalada] = useState('');

  useEffect(() => {
    void currentAppVersion().then(setVersionInstalada);
  }, []);

  const ejecutar = useCallback(async (force: boolean) => {
    if (force) setEstado('buscando');

    const current = await currentAppVersion();
    setVersionInstalada(current);

    if (!navigator.onLine) {
      if (force) setEstado('sin-red');
      return;
    }

    const info = await checkForUpdate({ current, force });
    setDisponible(info);
    if (force) setEstado(info ? 'hay-version' : 'al-dia');
  }, []);

  useEffect(() => {
    if (!automatico) return;
    void ejecutar(false);
  }, [automatico, ejecutar]);

  const buscar = useCallback(() => ejecutar(true), [ejecutar]);

  const descartar = useCallback(async () => {
    if (!disponible) return;
    await dismissUpdate(disponible.version);
    setDisponible(null);
    setEstado('inactivo');
  }, [disponible]);

  return { disponible, estado, versionInstalada, buscar, descartar };
}
