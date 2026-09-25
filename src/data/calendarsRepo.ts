import { parseIcs, type IcsEvent } from '@/domain/ics';
import type { LuminaNode, Schedule } from '@/domain/types';
import { nodesRepo, type AlcanceExterno, type ExternalEvent, type SyncResult } from './nodesRepo';
import { settingsRepo } from './settingsRepo';

export const CLAVE_SUSCRIPCIONES = 'calendarios.suscripciones';
export const CLAVE_ULTIMA_SINCRONIZACION = 'calendarios.ultimaSincronizacion';
export const CLAVE_CALENDARIOS_DISPOSITIVO = 'calendarios.dispositivo';

export const VENTANA_ATRAS_DIAS = 30;
export const VENTANA_ADELANTE_DIAS = 180;
export const SYNC_THROTTLE_MS = 6 * 3_600_000;

const PREFIJO_ARCHIVO = 'archivo';
const SIN_CAMBIOS: SyncResult = { creados: 0, actualizados: 0, eliminados: 0 };

export interface Suscripcion {
  id: string;
  nombre: string;
  url: string;
}

export function ventanaSincronizacion(now = new Date()): { desde: string; hasta: string } {
  return {
    desde: new Date(now.getTime() - VENTANA_ATRAS_DIAS * 86_400_000).toISOString(),
    hasta: new Date(now.getTime() + VENTANA_ADELANTE_DIAS * 86_400_000).toISOString(),
  };
}

function aEventoExterno(evento: IcsEvent, origen: string, prefijo: string): ExternalEvent {
  const schedule: Schedule = {
    start: evento.start,
    end: evento.end,
    allDay: evento.allDay,
  };

  return {
    externalId: `${prefijo}:${claveExterna(evento)}`,
    text: evento.summary || '(sin título)',
    schedule,
    calendar: origen,
  };
}

// Cada repetición de una serie es un nodo propio: se identifica por su inicio
// original para que moverla en el origen no le cambie la clave.
function claveExterna(evento: IcsEvent): string {
  return evento.recurrenceId === null ? evento.uid : `${evento.uid}@${evento.recurrenceId}`;
}

function eventosDelIcs(
  texto: string,
  ventana: { desde: string; hasta: string },
  origen: string,
  prefijo: string,
): ExternalEvent[] {
  return parseIcs(texto, ventana).map((evento) => aEventoExterno(evento, origen, prefijo));
}

function esDeArchivo(nodo: LuminaNode): boolean {
  return nodo.externalId?.startsWith(`${PREFIJO_ARCHIVO}:`) ?? false;
}

// Cada archivo se concilia solo contra lo que trajo ese mismo archivo, así
// importar otro no borra lo anterior.
function delArchivo(origen: string): AlcanceExterno {
  return (nodo) => esDeArchivo(nodo) && nodo.externalCalendar === origen;
}

function deLaSuscripcion(id: string): AlcanceExterno {
  return (nodo) => nodo.externalId?.startsWith(`${id}:`) ?? false;
}

function deSuscripciones(nodo: LuminaNode): boolean {
  return !esDeArchivo(nodo);
}

function sumarResultados(resultados: SyncResult[]): SyncResult {
  return resultados.reduce(
    (total, resultado) => ({
      creados: total.creados + resultado.creados,
      actualizados: total.actualizados + resultado.actualizados,
      eliminados: total.eliminados + resultado.eliminados,
    }),
    SIN_CAMBIOS,
  );
}

// webcal:// es el esquema que reparten Google, Outlook y iCloud para suscribirse;
// sobre HTTPS es el mismo archivo.
export function normalizarUrlIcs(url: string): string {
  return url.trim().replace(/^webcal:\/\//i, 'https://');
}

export async function listarSuscripciones(): Promise<Suscripcion[]> {
  return settingsRepo.get<Suscripcion[]>(CLAVE_SUSCRIPCIONES, []);
}

export async function agregarSuscripcion(nombre: string, url: string): Promise<Suscripcion> {
  const suscripcion: Suscripcion = {
    id: crypto.randomUUID(),
    nombre: nombre.trim() || 'Calendario',
    url: normalizarUrlIcs(url),
  };
  const actuales = await listarSuscripciones();
  await settingsRepo.set(CLAVE_SUSCRIPCIONES, [...actuales, suscripcion]);
  return suscripcion;
}

export async function quitarSuscripcion(id: string): Promise<void> {
  const actuales = await listarSuscripciones();
  await settingsRepo.set(
    CLAVE_SUSCRIPCIONES,
    actuales.filter((suscripcion) => suscripcion.id !== id),
  );
  await nodesRepo.removeSource('ics', deLaSuscripcion(id));
}

export async function importarIcs(
  texto: string,
  origen: string,
  now = new Date(),
): Promise<SyncResult> {
  const ventana = ventanaSincronizacion(now);
  const eventos = eventosDelIcs(texto, ventana, origen, PREFIJO_ARCHIVO);

  return nodesRepo.syncExternal('ics', eventos, ventana, delArchivo(origen));
}

export class CalendarioError extends Error {}

export async function sincronizarSuscripciones(
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
): Promise<SyncResult> {
  const suscripciones = await listarSuscripciones();
  const ventana = ventanaSincronizacion(now);
  const resultados: SyncResult[] = [];

  for (const suscripcion of suscripciones) {
    resultados.push(await sincronizarSuscripcion(suscripcion, ventana, fetchImpl));
  }

  await settingsRepo.set(CLAVE_ULTIMA_SINCRONIZACION, now.getTime());
  return sumarResultados(resultados);
}

// Una suscripción que no respondió no puede interpretarse como "ya no hay nada":
// conciliarla destruiría sus eventos por un problema de red.
async function sincronizarSuscripcion(
  suscripcion: Suscripcion,
  ventana: { desde: string; hasta: string },
  fetchImpl: typeof fetch,
): Promise<SyncResult> {
  const texto = await descargar(suscripcion.url, fetchImpl);
  if (texto === null) return SIN_CAMBIOS;

  const eventos = eventosDelIcs(texto, ventana, suscripcion.nombre, suscripcion.id);
  return nodesRepo.syncExternal('ics', eventos, ventana, deLaSuscripcion(suscripcion.id));
}

async function descargar(url: string, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const respuesta = await fetchImpl(url, { headers: { Accept: 'text/calendar' } });
    if (!respuesta.ok) return null;
    return await respuesta.text();
  } catch {
    return null;
  }
}

export async function debeSincronizar(now = new Date()): Promise<boolean> {
  const ultima = await settingsRepo.get(CLAVE_ULTIMA_SINCRONIZACION, 0);
  return now.getTime() - ultima >= SYNC_THROTTLE_MS;
}

export async function olvidarSuscripciones(): Promise<number> {
  await settingsRepo.set(CLAVE_SUSCRIPCIONES, []);
  return nodesRepo.removeSource('ics', deSuscripciones);
}
