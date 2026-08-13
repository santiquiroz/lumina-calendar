import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativo = vi.hoisted(() => ({ valor: true }));
const sistema = vi.hoisted(() => ({
  permiso: 'granted' as string,
  calendarios: [
    { id: '1', name: 'Personal', account: 'santi@gmail.com', color: 1 },
    { id: '2', name: 'Trabajo', account: 'santi@empresa.com', color: 2 },
  ],
  eventos: [] as unknown[],
  filtroRecibido: undefined as string[] | undefined,
}));

vi.mock('./appVersion', () => ({
  isNativePlatform: () => nativo.valor,
  currentAppVersion: async () => '1.2.0',
}));

vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({
    checkPermissions: async () => ({ calendar: sistema.permiso }),
    requestPermissions: async () => ({ calendar: sistema.permiso }),
    listCalendars: async () => ({ calendars: sistema.calendarios }),
    listEvents: async ({ calendarIds }: { calendarIds?: string[] }) => {
      sistema.filtroRecibido = calendarIds;
      return { events: sistema.eventos };
    },
  }),
}));

const { db } = await import('./db');
const { nodesRepo } = await import('./nodesRepo');
const {
  elegirCalendarios,
  listarCalendariosDelDispositivo,
  olvidarCalendariosDelDispositivo,
  pedirPermisoCalendario,
  sincronizarCalendariosDelDispositivo,
  tienePermisoCalendario,
} = await import('./deviceCalendar');

const AHORA = new Date('2026-08-12T12:00:00.000Z');

function eventoDelSistema(id: string, titulo: string, desde: Date) {
  return {
    id,
    calendarId: '1',
    title: titulo,
    startMs: desde.getTime(),
    endMs: desde.getTime() + 3_600_000,
    allDay: false,
  };
}

beforeEach(async () => {
  await db.nodes.clear();
  await db.activities.clear();
  await db.settings.clear();
  nativo.valor = true;
  sistema.permiso = 'granted';
  sistema.eventos = [];
  sistema.filtroRecibido = undefined;
});

describe('permisos', () => {
  it('reconoce el permiso concedido', async () => {
    expect(await tienePermisoCalendario()).toBe(true);
  });

  it('no hay calendarios del sistema en el navegador', async () => {
    nativo.valor = false;
    expect(await tienePermisoCalendario()).toBe(false);
    expect(await pedirPermisoCalendario()).toBe(false);
    expect(await listarCalendariosDelDispositivo()).toEqual([]);
  });

  it('sin permiso no devuelve calendarios', async () => {
    sistema.permiso = 'denied';
    expect(await listarCalendariosDelDispositivo()).toEqual([]);
  });
});

describe('sincronizarCalendariosDelDispositivo', () => {
  it('no hace nada si no se eligió ningún calendario', async () => {
    sistema.eventos = [eventoDelSistema('a', 'Reunión', new Date('2026-08-13T14:00:00.000Z'))];
    const resultado = await sincronizarCalendariosDelDispositivo(AHORA);

    expect(resultado).toEqual({ creados: 0, actualizados: 0, eliminados: 0 });
    expect(await db.nodes.count()).toBe(0);
  });

  it('importa los eventos de los calendarios elegidos', async () => {
    await elegirCalendarios(['1']);
    sistema.eventos = [eventoDelSistema('a', 'Reunión', new Date('2026-08-13T14:00:00.000Z'))];

    expect((await sincronizarCalendariosDelDispositivo(AHORA)).creados).toBe(1);

    const nodo = (await db.nodes.toArray())[0];
    expect(nodo.text).toBe('Reunión');
    expect(nodo.source).toBe('device');
    expect(nodo.externalCalendar).toBe('Personal');
    expect(sistema.filtroRecibido).toEqual(['1']);
  });

  it('reimportar no duplica y refleja los cambios del sistema', async () => {
    await elegirCalendarios(['1']);
    sistema.eventos = [eventoDelSistema('a', 'Reunión', new Date('2026-08-13T14:00:00.000Z'))];
    await sincronizarCalendariosDelDispositivo(AHORA);

    sistema.eventos = [eventoDelSistema('a', 'Reunión movida', new Date('2026-08-13T16:00:00.000Z'))];
    const segunda = await sincronizarCalendariosDelDispositivo(AHORA);

    expect(segunda.actualizados).toBe(1);
    expect(await db.nodes.count()).toBe(1);
    expect((await db.nodes.toArray())[0].text).toBe('Reunión movida');
  });

  it('un evento sin título se muestra con una etiqueta legible', async () => {
    await elegirCalendarios(['1']);
    sistema.eventos = [eventoDelSistema('a', '', new Date('2026-08-13T14:00:00.000Z'))];
    await sincronizarCalendariosDelDispositivo(AHORA);

    expect((await db.nodes.toArray())[0].text).toBe('(sin título)');
  });

  it('sin permiso no importa nada', async () => {
    await elegirCalendarios(['1']);
    sistema.permiso = 'denied';

    expect((await sincronizarCalendariosDelDispositivo(AHORA)).creados).toBe(0);
  });
});

describe('olvidarCalendariosDelDispositivo', () => {
  it('borra lo importado y desmarca los calendarios', async () => {
    await elegirCalendarios(['1']);
    sistema.eventos = [eventoDelSistema('a', 'Reunión', new Date('2026-08-13T14:00:00.000Z'))];
    await sincronizarCalendariosDelDispositivo(AHORA);

    expect(await olvidarCalendariosDelDispositivo()).toBe(1);
    expect(await nodesRepo.countBySource('device')).toBe(0);
  });
});
