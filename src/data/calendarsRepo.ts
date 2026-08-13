import { parseIcs, type IcsEvent } from '@/domain/ics';
import type { Schedule } from '@/domain/types';
import { nodesRepo, type ExternalEvent, type SyncResult } from './nodesRepo';
import { settingsRepo } from './settingsRepo';

export const CLAVE_SUSCRIPCIONES = 'calendarios.suscripciones';
export const CLAVE_ULTIMA_SINCRONIZACION = 'calendarios.ultimaSincronizacion';
export const CLAVE_CALENDARIOS_DISPOSITIVO = 'calendarios.dispositivo';

export const VENTANA_ATRAS_DIAS = 30;
export const VENTANA_ADELANTE_DIAS = 180;
export const SYNC_THROTTLE_MS = 6 * 3_600_000;

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

function dentroDeVentana(evento: IcsEvent, ventana: { desde: string; hasta: string }): boolean {
  return evento.start < ventana.hasta && evento.end > ventana.desde;
}

function aEventoExterno(evento: IcsEvent, origen: string, prefijo: string): ExternalEvent {
  const schedule: Schedule = {
    start: evento.start,
    end: evento.end,
    allDay: evento.allDay,
  };

  return {
    externalId: `${prefijo}:${evento.uid}`,
    text: evento.summary || '(sin título)',
    schedule,
    calendar: origen,
  };
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
}

export async function importarIcs(
  texto: string,
  origen: string,
  now = new Date(),
): Promise<SyncResult> {
  const ventana = ventanaSincronizacion(now);
  const eventos = parseIcs(texto)
    .filter((evento) => dentroDeVentana(evento, ventana))
    .map((evento) => aEventoExterno(evento, origen, 'archivo'));

  return nodesRepo.syncExternal('ics', eventos, ventana);
}

export class CalendarioError extends Error {}

export async function sincronizarSuscripciones(
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
): Promise<SyncResult> {
  const suscripciones = await listarSuscripciones();
  const ventana = ventanaSincronizacion(now);
  const eventos: ExternalEvent[] = [];
  let todasRespondieron = true;

  for (const suscripcion of suscripciones) {
    const texto = await descargar(suscripcion.url, fetchImpl);
    if (texto === null) {
      todasRespondieron = false;
      continue;
    }

    for (const evento of parseIcs(texto)) {
      if (dentroDeVentana(evento, ventana)) {
        eventos.push(aEventoExterno(evento, suscripcion.nombre, suscripcion.id));
      }
    }
  }

  const resultado = await nodesRepo.syncExternal('ics', eventos, ventana, todasRespondieron);
  await settingsRepo.set(CLAVE_ULTIMA_SINCRONIZACION, now.getTime());
  return resultado;
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
  return nodesRepo.removeSource('ics');
}
