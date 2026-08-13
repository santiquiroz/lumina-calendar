import { z } from 'zod';
import type { Activity, LuminaNode } from '@/domain/types';
import { db } from './db';

export const BACKUP_SCHEMA_VERSION = 2;

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const scheduleSchema = z.object({
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
});

// Los respaldos de la versión 1 no traen el origen: se completan con los
// valores propios de Lumina para que un archivo viejo siga siendo importable.
const nodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  source: z.enum(['lumina', 'device', 'ics']).default('lumina'),
  externalId: z.string().nullable().default(null),
  externalCalendar: z.string().nullable().default(null),
  text: z.string(),
  done: z.boolean(),
  order: z.string(),
  collapsed: z.boolean(),
  schedule: scheduleSchema.nullable(),
  tags: z.array(z.string()),
  colorKey: z.enum(['indigo', 'teal', 'rose', 'amber', 'slate']).nullable(),
  recurrence: z
    .object({
      freq: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number(),
      until: z.string().nullable(),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
});

const activitySchema = z.object({
  id: z.string(),
  type: z.enum(['capture', 'complete', 'schedule']),
  nodeId: z.string(),
  at: z.string(),
});

const backupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  nodes: z.array(nodeSchema),
  activities: z.array(activitySchema),
});

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  nodes: LuminaNode[];
  activities: Activity[];
}

export type ImportMode = 'replace' | 'merge';

export async function exportBackup(): Promise<BackupFile> {
  const [nodes, activities] = await Promise.all([db.nodes.toArray(), db.activities.toArray()]);
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    nodes,
    activities,
  };
}

export function parseBackup(input: unknown): BackupFile {
  const resultado = backupSchema.safeParse(input);
  if (!resultado.success) {
    throw new BackupError('El archivo no tiene el formato de respaldo de Lumina.');
  }
  if (resultado.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupError(
      `El respaldo usa la versión ${resultado.data.schemaVersion}, más nueva que esta app. Actualizá Lumina para abrirlo.`,
    );
  }
  return resultado.data as BackupFile;
}

export async function importBackup(
  file: BackupFile,
  mode: ImportMode,
): Promise<{ nodos: number; actividades: number }> {
  return db.transaction('rw', db.nodes, db.activities, async () => {
    if (mode === 'replace') {
      await db.nodes.clear();
      await db.activities.clear();
    }
    await db.nodes.bulkPut(file.nodes);
    await db.activities.bulkPut(file.activities);
    return { nodos: file.nodes.length, actividades: file.activities.length };
  });
}

export function backupFileName(now = new Date()): string {
  const dia = now.toISOString().slice(0, 10);
  return `lumina-respaldo-${dia}.json`;
}
