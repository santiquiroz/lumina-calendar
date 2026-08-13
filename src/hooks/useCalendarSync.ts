import { useEffect } from 'react';
import { debeSincronizar, sincronizarSuscripciones } from '@/data/calendarsRepo';
import { sincronizarCalendariosDelDispositivo } from '@/data/deviceCalendar';

// Sincronización silenciosa al abrir la app, con el mismo criterio que el resto
// del producto: si falla, no se avisa ni se interrumpe nada.
async function sincronizarEnSilencio(): Promise<void> {
  if (!(await debeSincronizar())) return;

  try {
    await sincronizarCalendariosDelDispositivo();
  } catch {
    // el calendario del sistema puede no estar disponible
  }

  try {
    await sincronizarSuscripciones();
  } catch {
    // sin red no pasa nada
  }
}

export function useCalendarSync(): void {
  useEffect(() => {
    void sincronizarEnSilencio();
  }, []);
}
