import { registerPlugin } from '@capacitor/core';
import { isNativePlatform } from './appVersion';
import { nodesRepo, type ExternalEvent, type SyncResult } from './nodesRepo';
import { settingsRepo } from './settingsRepo';
import { ventanaSincronizacion, CLAVE_CALENDARIOS_DISPOSITIVO } from './calendarsRepo';

export interface DeviceCalendar {
  id: string;
  name: string;
  account: string;
  color: number;
}

interface DeviceEvent {
  id: string;
  calendarId: string;
  title: string;
  startMs: number;
  endMs: number;
  allDay: boolean;
}

interface DeviceCalendarPlugin {
  checkPermissions(): Promise<{ calendar: string }>;
  requestPermissions(): Promise<{ calendar: string }>;
  listCalendars(): Promise<{ calendars: DeviceCalendar[] }>;
  listEvents(opciones: {
    startMs: number;
    endMs: number;
    calendarIds?: string[];
  }): Promise<{ events: DeviceEvent[] }>;
}

const plugin = registerPlugin<DeviceCalendarPlugin>('DeviceCalendar');

export function calendariosDisponibles(): boolean {
  return isNativePlatform();
}

export async function tienePermisoCalendario(): Promise<boolean> {
  if (!calendariosDisponibles()) return false;
  return (await plugin.checkPermissions()).calendar === 'granted';
}

export async function pedirPermisoCalendario(): Promise<boolean> {
  if (!calendariosDisponibles()) return false;
  if (await tienePermisoCalendario()) return true;
  return (await plugin.requestPermissions()).calendar === 'granted';
}

export async function listarCalendariosDelDispositivo(): Promise<DeviceCalendar[]> {
  if (!(await tienePermisoCalendario())) return [];
  return (await plugin.listCalendars()).calendars;
}

export async function calendariosElegidos(): Promise<string[]> {
  return settingsRepo.get<string[]>(CLAVE_CALENDARIOS_DISPOSITIVO, []);
}

export async function elegirCalendarios(ids: string[]): Promise<void> {
  await settingsRepo.set(CLAVE_CALENDARIOS_DISPOSITIVO, ids);
}

function aEventoExterno(evento: DeviceEvent, nombrePorId: Map<string, string>): ExternalEvent {
  return {
    externalId: `dispositivo:${evento.id}`,
    text: evento.title || '(sin título)',
    schedule: {
      start: new Date(evento.startMs).toISOString(),
      end: new Date(Math.max(evento.endMs, evento.startMs + 60_000)).toISOString(),
      allDay: evento.allDay,
    },
    calendar: nombrePorId.get(evento.calendarId) ?? 'Calendario del teléfono',
  };
}

export async function sincronizarCalendariosDelDispositivo(now = new Date()): Promise<SyncResult> {
  const vacio: SyncResult = { creados: 0, actualizados: 0, eliminados: 0 };
  if (!(await tienePermisoCalendario())) return vacio;

  const elegidos = await calendariosElegidos();
  if (elegidos.length === 0) return vacio;

  const ventana = ventanaSincronizacion(now);
  const calendarios = await listarCalendariosDelDispositivo();
  const nombrePorId = new Map(calendarios.map((calendario) => [calendario.id, calendario.name]));

  const { events } = await plugin.listEvents({
    startMs: new Date(ventana.desde).getTime(),
    endMs: new Date(ventana.hasta).getTime(),
    calendarIds: elegidos,
  });

  return nodesRepo.syncExternal(
    'device',
    events.map((evento) => aEventoExterno(evento, nombrePorId)),
    ventana,
  );
}

export async function olvidarCalendariosDelDispositivo(): Promise<number> {
  await elegirCalendarios([]);
  return nodesRepo.removeSource('device');
}
