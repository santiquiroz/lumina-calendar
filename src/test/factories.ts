import type { Activity, LuminaNode, Schedule } from '@/domain/types';

let contador = 0;

export function buildNode(overrides: Partial<LuminaNode> = {}): LuminaNode {
  contador += 1;
  const ahora = '2026-08-12T10:00:00.000Z';
  return {
    id: `n${contador}`,
    parentId: null,
    source: 'lumina',
    externalId: null,
    externalCalendar: null,
    text: `Nodo ${contador}`,
    done: false,
    order: 'U',
    collapsed: false,
    schedule: null,
    tags: [],
    colorKey: null,
    recurrence: null,
    createdAt: ahora,
    updatedAt: ahora,
    completedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

export function buildChain(length: number): LuminaNode[] {
  const nodos: LuminaNode[] = [];
  for (let i = 0; i < length; i += 1) {
    nodos.push(
      buildNode({ id: `c${i}`, parentId: i === 0 ? null : `c${i - 1}`, text: `Nivel ${i}` }),
    );
  }
  return nodos;
}

export function buildSchedule(startIso: string, minutos: number, allDay = false): Schedule {
  const inicio = new Date(startIso);
  return {
    start: inicio.toISOString(),
    end: new Date(inicio.getTime() + minutos * 60_000).toISOString(),
    allDay,
  };
}

export function buildActivity(overrides: Partial<Activity> = {}): Activity {
  contador += 1;
  return {
    id: `act${contador}`,
    type: 'capture',
    nodeId: 'n1',
    at: '2026-08-12T10:00:00.000Z',
    ...overrides,
  };
}
