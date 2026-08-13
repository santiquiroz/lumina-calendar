import { dayBounds, type CalendarDay } from '@/domain/calendarDay';
import { DomainError } from '@/domain/errors';
import { orderBetween } from '@/domain/order';
import { assertMoveAllowed, depthOf, descendantsOf, indexNodes, MAX_DEPTH } from '@/domain/tree';
import type { EventColorKey, LuminaNode, NodeId, NodeSource, Schedule } from '@/domain/types';
import { crearActividad } from './activityRepo';
import { ahoraIso, db, nuevoId } from './db';

export interface CreateNodeInput {
  text: string;
  parentId?: NodeId | null;
  schedule?: Schedule | null;
  colorKey?: EventColorKey | null;
  beforeId?: NodeId | null;
  afterId?: NodeId | null;
  source?: NodeSource;
  externalId?: string | null;
  externalCalendar?: string | null;
}

export interface ExternalEvent {
  externalId: string;
  text: string;
  schedule: Schedule;
  calendar: string | null;
}

export interface SyncResult {
  creados: number;
  actualizados: number;
  eliminados: number;
}

export interface MovePosition {
  beforeId?: NodeId | null;
  afterId?: NodeId | null;
}

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function validarHorario(schedule: Schedule): void {
  if (new Date(schedule.end).getTime() <= new Date(schedule.start).getTime()) {
    throw new DomainError('INVALID_SCHEDULE', 'El evento debe terminar después de empezar');
  }
}

function claveDeOrden(
  hermanos: LuminaNode[],
  posicion: MovePosition,
  idIgnorado?: NodeId,
): string {
  const lista = hermanos.filter((n) => n.id !== idIgnorado);
  const indiceAntes = posicion.afterId ? lista.findIndex((n) => n.id === posicion.afterId) : -1;
  const indiceDespues = posicion.beforeId ? lista.findIndex((n) => n.id === posicion.beforeId) : -1;

  if (indiceAntes >= 0) {
    return orderBetween(lista[indiceAntes].order, lista[indiceAntes + 1]?.order ?? null);
  }
  if (indiceDespues >= 0) {
    return orderBetween(lista[indiceDespues - 1]?.order ?? null, lista[indiceDespues].order);
  }
  return orderBetween(lista.at(-1)?.order ?? null, null);
}

async function hermanosDe(parentId: NodeId | null): Promise<LuminaNode[]> {
  const index = indexNodes(await db.nodes.toArray());

  if (parentId !== null && index.byId.has(parentId) && depthOf(index, parentId) + 1 > MAX_DEPTH) {
    throw new DomainError(
      'MAX_DEPTH',
      `No se pueden crear más de ${MAX_DEPTH} niveles de anidación`,
    );
  }

  return index.childrenOf(parentId);
}

function nodoBase(input: CreateNodeInput, order: string): LuminaNode {
  const ahora = ahoraIso();
  return {
    id: nuevoId(),
    parentId: input.parentId ?? null,
    source: input.source ?? 'lumina',
    externalId: input.externalId ?? null,
    externalCalendar: input.externalCalendar ?? null,
    text: input.text,
    done: false,
    order,
    collapsed: false,
    schedule: input.schedule ?? null,
    tags: [],
    colorKey: input.colorKey ?? null,
    recurrence: null,
    createdAt: ahora,
    updatedAt: ahora,
    completedAt: null,
    deletedAt: null,
  };
}

export const nodesRepo = {
  async create(input: CreateNodeInput): Promise<LuminaNode> {
    if (input.schedule) validarHorario(input.schedule);

    const hermanos = await hermanosDe(input.parentId ?? null);
    const nodo = nodoBase(input, claveDeOrden(hermanos, input));

    await db.transaction('rw', db.nodes, db.activities, async () => {
      await db.nodes.add(nodo);
      await db.activities.add(crearActividad('capture', nodo.id));
      if (nodo.schedule) await db.activities.add(crearActividad('schedule', nodo.id));
    });

    return nodo;
  },

  async update(id: NodeId, patch: Partial<Omit<LuminaNode, 'id'>>): Promise<void> {
    if (patch.schedule) validarHorario(patch.schedule);
    await db.nodes.update(id, { ...patch, updatedAt: ahoraIso() });
  },

  async toggleDone(id: NodeId): Promise<void> {
    await db.transaction('rw', db.nodes, db.activities, async () => {
      const nodo = await db.nodes.get(id);
      if (!nodo) throw new DomainError('NOT_FOUND', `No existe el nodo ${id}`);

      const completado = !nodo.done;
      await db.nodes.update(id, {
        done: completado,
        completedAt: completado ? ahoraIso() : null,
        updatedAt: ahoraIso(),
      });

      if (completado) await db.activities.add(crearActividad('complete', id));
    });
  },

  async schedule(id: NodeId, schedule: Schedule | null): Promise<void> {
    if (schedule) validarHorario(schedule);

    await db.transaction('rw', db.nodes, db.activities, async () => {
      const nodo = await db.nodes.get(id);
      if (!nodo) throw new DomainError('NOT_FOUND', `No existe el nodo ${id}`);

      await db.nodes.update(id, { schedule, updatedAt: ahoraIso() });
      if (schedule) await db.activities.add(crearActividad('schedule', id));
    });
  },

  async move(id: NodeId, newParentId: NodeId | null, posicion: MovePosition = {}): Promise<void> {
    const todos = await db.nodes.toArray();
    const index = indexNodes(todos);
    assertMoveAllowed(index, id, newParentId);

    const hermanos = index.childrenOf(newParentId);
    await db.nodes.update(id, {
      parentId: newParentId,
      order: claveDeOrden(hermanos, posicion, id),
      updatedAt: ahoraIso(),
    });
  },

  async softDelete(id: NodeId): Promise<string> {
    const marca = ahoraIso();
    const todos = await db.nodes.toArray();
    const index = indexNodes(todos);
    if (!index.byId.has(id)) throw new DomainError('NOT_FOUND', `No existe el nodo ${id}`);

    const ids = [id, ...descendantsOf(index, id).map((n) => n.id)];
    await db.nodes.where('id').anyOf(ids).modify({ deletedAt: marca, updatedAt: marca });
    return marca;
  },

  async restore(id: NodeId): Promise<void> {
    const nodo = await db.nodes.get(id);
    if (!nodo?.deletedAt) return;

    const marca = nodo.deletedAt;
    await db.nodes.where('deletedAt').equals(marca).modify({ deletedAt: null });
  },

  listAll(): Promise<LuminaNode[]> {
    return db.nodes.toArray();
  },

  async listByDay(day: CalendarDay): Promise<LuminaNode[]> {
    const { start, end } = dayBounds(day);
    const todos = await db.nodes.toArray();

    return indexNodes(todos)
      .roots()
      .filter((nodo) => {
        if (!nodo.schedule) return false;
        const inicio = new Date(nodo.schedule.start).getTime();
        const fin = new Date(nodo.schedule.end).getTime();
        return inicio < end.getTime() && fin > start.getTime();
      })
      .sort((a, b) => (a.schedule as Schedule).start.localeCompare((b.schedule as Schedule).start));
  },

  async listIdeas(): Promise<LuminaNode[]> {
    const todos = await db.nodes.toArray();
    return indexNodes(todos)
      .roots()
      .filter((nodo) => nodo.schedule === null);
  },

  async listSubtree(rootId: NodeId): Promise<LuminaNode[]> {
    const todos = await db.nodes.toArray();
    const index = indexNodes(todos);
    return index.byId.has(rootId) ? descendantsOf(index, rootId) : [];
  },

  async search(query: string): Promise<LuminaNode[]> {
    const aguja = normalizarTexto(query.trim());
    if (aguja === '') return [];

    const todos = await db.nodes.toArray();
    return todos.filter(
      (nodo) =>
        nodo.deletedAt === null &&
        (normalizarTexto(nodo.text).includes(aguja) ||
          nodo.tags.some((tag) => normalizarTexto(tag).includes(aguja))),
    );
  },

  clear(): Promise<void> {
    return db.nodes.clear();
  },

  // Trae el calendario externo al modelo propio: crea lo nuevo, actualiza texto
  // y horario de lo conocido (sin tocar subtareas ni completados que agregó la
  // persona) y borra lo que desapareció, pero solo dentro de la ventana que se
  // sincronizó, para no arrastrar eventos que ni se consultaron.
  async syncExternal(
    source: Exclude<NodeSource, 'lumina'>,
    eventos: ExternalEvent[],
    ventana: { desde: string; hasta: string },
    // Una fuente que no respondió no puede interpretarse como "ya no hay nada":
    // borrar en ese caso destruiría eventos por un problema de red.
    borrarAusentes = true,
  ): Promise<SyncResult> {
    const ahora = ahoraIso();
    const existentes = (await db.nodes.toArray()).filter(
      (nodo) => nodo.source === source && nodo.externalId !== null,
    );
    const porId = new Map(existentes.map((nodo) => [nodo.externalId as string, nodo]));
    const vistos = new Set(eventos.map((evento) => evento.externalId));

    let creados = 0;
    let actualizados = 0;

    for (const evento of eventos) {
      const previo = porId.get(evento.externalId);

      if (!previo) {
        const hermanos = indexNodes(await db.nodes.toArray()).childrenOf(null);
        await db.nodes.add(
          nodoBase(
            {
              text: evento.text,
              schedule: evento.schedule,
              source,
              externalId: evento.externalId,
              externalCalendar: evento.calendar,
            },
            claveDeOrden(hermanos, {}),
          ),
        );
        creados += 1;
        continue;
      }

      const cambio =
        previo.text !== evento.text ||
        previo.schedule?.start !== evento.schedule.start ||
        previo.schedule?.end !== evento.schedule.end ||
        previo.deletedAt !== null;

      if (cambio) {
        await db.nodes.update(previo.id, {
          text: evento.text,
          schedule: evento.schedule,
          externalCalendar: evento.calendar,
          deletedAt: null,
          updatedAt: ahora,
        });
        actualizados += 1;
      }
    }

    const desaparecidos = existentes.filter(
      (nodo) =>
        borrarAusentes &&
        nodo.deletedAt === null &&
        !vistos.has(nodo.externalId as string) &&
        nodo.schedule !== null &&
        nodo.schedule.start >= ventana.desde &&
        nodo.schedule.start < ventana.hasta,
    );

    for (const nodo of desaparecidos) {
      await db.nodes.update(nodo.id, { deletedAt: ahora, updatedAt: ahora });
    }

    return { creados, actualizados, eliminados: desaparecidos.length };
  },

  async countBySource(source: NodeSource): Promise<number> {
    const nodos = await db.nodes.toArray();
    return nodos.filter((nodo) => nodo.source === source && nodo.deletedAt === null).length;
  },

  async removeSource(source: Exclude<NodeSource, 'lumina'>): Promise<number> {
    const ahora = ahoraIso();
    const objetivos = (await db.nodes.toArray()).filter(
      (nodo) => nodo.source === source && nodo.deletedAt === null,
    );
    for (const nodo of objetivos) {
      await db.nodes.update(nodo.id, { deletedAt: ahora, updatedAt: ahora });
    }
    return objetivos.length;
  },
};
