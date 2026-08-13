import { LocalNotifications } from '@capacitor/local-notifications';
import { allReminders, type Reminder } from '@/domain/reminders';
import type { LuminaNode } from '@/domain/types';
import { isNativePlatform } from './appVersion';
import { settingsRepo } from './settingsRepo';

export const CLAVE_AVISOS = 'avisos.activados';

export type EstadoAvisos = 'activos' | 'sin-permiso' | 'apagados' | 'no-soportado';

export async function avisosActivados(): Promise<boolean> {
  return settingsRepo.get(CLAVE_AVISOS, true);
}

export async function setAvisosActivados(valor: boolean): Promise<void> {
  await settingsRepo.set(CLAVE_AVISOS, valor);
}

export async function pedirPermisoAvisos(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const actual = await LocalNotifications.checkPermissions();
  if (actual.display === 'granted') return true;
  const pedido = await LocalNotifications.requestPermissions();
  return pedido.display === 'granted';
}

function aNotificacion(aviso: Reminder) {
  return {
    id: aviso.id,
    title: aviso.titulo,
    body: aviso.cuerpo,
    schedule: { at: aviso.at, allowWhileIdle: aviso.kind === 'ambar' },
    smallIcon: 'ic_stat_icon_config_sample',
    extra: { nodeId: aviso.nodeId, kind: aviso.kind },
  };
}

async function cancelarTodo(): Promise<void> {
  const pendientes = await LocalNotifications.getPending();
  if (pendientes.notifications.length === 0) return;
  await LocalNotifications.cancel({ notifications: pendientes.notifications });
}

// Reprograma desde cero: es más barato y más seguro que llevar un diff, porque
// los identificadores son deterministas y la ventana es de treinta días.
export async function sincronizarAvisos(
  nodos: LuminaNode[],
  now = new Date(),
): Promise<EstadoAvisos> {
  if (!isNativePlatform()) return 'no-soportado';

  if (!(await avisosActivados())) {
    await cancelarTodo();
    return 'apagados';
  }

  const permiso = await LocalNotifications.checkPermissions();
  if (permiso.display !== 'granted') return 'sin-permiso';

  await cancelarTodo();

  const avisos = allReminders(nodos, now);
  if (avisos.length > 0) {
    await LocalNotifications.schedule({ notifications: avisos.map(aNotificacion) });
  }
  return 'activos';
}

export async function avisosPendientes(): Promise<number> {
  if (!isNativePlatform()) return 0;
  return (await LocalNotifications.getPending()).notifications.length;
}
