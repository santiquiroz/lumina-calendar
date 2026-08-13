import Dexie, { type Table } from 'dexie';
import type { Activity, LuminaNode } from '@/domain/types';

export interface SettingRecord {
  key: string;
  value: unknown;
}

export class LuminaDb extends Dexie {
  nodes!: Table<LuminaNode, string>;
  activities!: Table<Activity, string>;
  settings!: Table<SettingRecord, string>;

  constructor(nombre = 'lumina') {
    super(nombre);
    this.version(1).stores({
      nodes: 'id, parentId, deletedAt, *tags',
      activities: 'id, type, nodeId, at',
      settings: 'key',
    });

    // v2 agrega el origen del nodo para poder importar calendarios externos sin
    // duplicar en cada sincronización.
    this.version(2)
      .stores({
        nodes: 'id, parentId, deletedAt, source, externalId, *tags',
        activities: 'id, type, nodeId, at',
        settings: 'key',
      })
      .upgrade((transaccion) =>
        transaccion
          .table<LuminaNode>('nodes')
          .toCollection()
          .modify((nodo) => {
            nodo.source = 'lumina';
            nodo.externalId = null;
            nodo.externalCalendar = null;
          }),
      );
  }
}

export const db = new LuminaDb();

export function nuevoId(): string {
  return crypto.randomUUID();
}

export function ahoraIso(): string {
  return new Date().toISOString();
}
