import { amberThresholdMs, durationMs } from './time';
import type { LuminaNode, NodeId, Schedule } from './types';

export type ReminderKind = 'ambar' | 'inicio';

export interface Reminder {
  id: number;
  nodeId: NodeId;
  kind: ReminderKind;
  at: Date;
  titulo: string;
  cuerpo: string;
}

export const REMINDER_WINDOW_DAYS = 30;

// Los identificadores de notificación en Android son enteros de 32 bits, así que
// el id del nodo (un UUID) se reduce a un hash estable y determinista: el mismo
// nodo siempre reprograma sobre su propio aviso en vez de duplicarlo.
export function reminderId(nodeId: NodeId, kind: ReminderKind): number {
  const semilla = `${nodeId}:${kind}`;
  let hash = 2166136261;
  for (let i = 0; i < semilla.length; i += 1) {
    hash ^= semilla.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 2_000_000_000) + 1;
}

function minutosDe(ms: number): number {
  return Math.max(1, Math.round(ms / 60_000));
}

function avisoAmbar(nodo: LuminaNode, schedule: Schedule): Reminder {
  const umbral = amberThresholdMs(durationMs(schedule));
  const fin = new Date(schedule.end).getTime();

  return {
    id: reminderId(nodo.id, 'ambar'),
    nodeId: nodo.id,
    kind: 'ambar',
    at: new Date(fin - umbral),
    titulo: nodo.text || 'Bloque en curso',
    cuerpo: `Quedan ${minutosDe(umbral)} min. Buen momento para ir cerrando.`,
  };
}

function avisoInicio(nodo: LuminaNode, schedule: Schedule): Reminder {
  return {
    id: reminderId(nodo.id, 'inicio'),
    nodeId: nodo.id,
    kind: 'inicio',
    at: new Date(schedule.start),
    titulo: nodo.text || 'Empieza ahora',
    cuerpo: 'Arranca este bloque.',
  };
}

export function remindersFor(nodo: LuminaNode, now: Date): Reminder[] {
  if (!nodo.schedule || nodo.done || nodo.deletedAt !== null) return [];
  if (nodo.schedule.allDay) return [];

  const limite = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 86_400_000);

  return [avisoInicio(nodo, nodo.schedule), avisoAmbar(nodo, nodo.schedule)].filter(
    (aviso) => aviso.at > now && aviso.at <= limite,
  );
}

export function allReminders(nodos: LuminaNode[], now: Date): Reminder[] {
  return nodos.flatMap((nodo) => remindersFor(nodo, now));
}
