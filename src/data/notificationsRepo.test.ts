import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNode, buildSchedule } from '@/test/factories';

const nativo = vi.hoisted(() => ({ valor: true }));
const plugin = vi.hoisted(() => ({
  permiso: 'granted' as string,
  pendientes: [] as { id: number }[],
  programadas: [] as unknown[],
  canceladas: 0,
}));

vi.mock('./appVersion', () => ({
  isNativePlatform: () => nativo.valor,
  currentAppVersion: async () => '1.2.0',
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: async () => ({ display: plugin.permiso }),
    requestPermissions: async () => ({ display: plugin.permiso }),
    getPending: async () => ({ notifications: plugin.pendientes }),
    cancel: async () => {
      plugin.canceladas += 1;
      plugin.pendientes = [];
    },
    schedule: async ({ notifications }: { notifications: unknown[] }) => {
      plugin.programadas = notifications;
      plugin.pendientes = notifications as { id: number }[];
    },
  },
}));

const { db } = await import('./db');
const { avisosPendientes, setAvisosActivados, sincronizarAvisos } = await import(
  './notificationsRepo'
);

function eventoFuturo() {
  const inicio = new Date(Date.now() + 3 * 3_600_000).toISOString();
  return buildNode({ text: 'Reunión', schedule: buildSchedule(inicio, 60) });
}

beforeEach(async () => {
  await db.settings.clear();
  nativo.valor = true;
  plugin.permiso = 'granted';
  plugin.pendientes = [];
  plugin.programadas = [];
  plugin.canceladas = 0;
});

describe('sincronizarAvisos', () => {
  it('programa el arranque y el ámbar de cada evento futuro', async () => {
    expect(await sincronizarAvisos([eventoFuturo()])).toBe('activos');
    expect(plugin.programadas).toHaveLength(2);
  });

  it('no programa nada en el navegador', async () => {
    nativo.valor = false;
    expect(await sincronizarAvisos([eventoFuturo()])).toBe('no-soportado');
    expect(plugin.programadas).toHaveLength(0);
  });

  it('respeta el interruptor apagado y limpia lo pendiente', async () => {
    await setAvisosActivados(false);
    plugin.pendientes = [{ id: 1 }];

    expect(await sincronizarAvisos([eventoFuturo()])).toBe('apagados');
    expect(plugin.canceladas).toBe(1);
    expect(plugin.programadas).toHaveLength(0);
  });

  it('avisa cuando Android no dio permiso, sin romperse', async () => {
    plugin.permiso = 'denied';
    expect(await sincronizarAvisos([eventoFuturo()])).toBe('sin-permiso');
    expect(plugin.programadas).toHaveLength(0);
  });

  it('reprograma desde cero para no duplicar avisos', async () => {
    await sincronizarAvisos([eventoFuturo()]);
    await sincronizarAvisos([eventoFuturo()]);

    expect(plugin.canceladas).toBe(1);
    expect(plugin.programadas).toHaveLength(2);
  });

  it('sin eventos no programa nada pero deja el estado activo', async () => {
    expect(await sincronizarAvisos([])).toBe('activos');
    expect(plugin.programadas).toHaveLength(0);
  });

  it('cada aviso lleva el nodo y el tipo en sus datos', async () => {
    const evento = eventoFuturo();
    await sincronizarAvisos([evento]);

    const extras = (plugin.programadas as { extra: { nodeId: string; kind: string } }[]).map(
      (aviso) => aviso.extra,
    );
    expect(extras.map((extra) => extra.kind)).toEqual(['inicio', 'ambar']);
    expect(extras.every((extra) => extra.nodeId === evento.id)).toBe(true);
  });
});

describe('avisosPendientes', () => {
  it('cuenta lo que quedó programado', async () => {
    await sincronizarAvisos([eventoFuturo()]);
    expect(await avisosPendientes()).toBe(2);
  });

  it('devuelve cero en el navegador', async () => {
    nativo.valor = false;
    expect(await avisosPendientes()).toBe(0);
  });
});
