import { z } from 'zod';
import type { Activity, LuminaNode } from '@/domain/types';
import { CLAVE_CALENDARIOS_DISPOSITIVO, CLAVE_SUSCRIPCIONES } from './calendarsRepo';
import { db, type SettingRecord } from './db';
import { CLAVE_EVENTOS_OCULTOS } from './nodesRepo';
import { CLAVE_AVISOS } from './notificationsRepo';
import { CLAVE_TEMA } from './settingsRepo';

export const BACKUP_SCHEMA_VERSION = 3;

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

const suscripcionSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  url: z.string(),
});

// Lista blanca: lo que es de la persona viaja en el respaldo; lo propio del
// dispositivo (última sincronización, chequeo de versión) no. zod descarta
// cualquier otra clave.
const settingsSchema = z.object({
  [CLAVE_SUSCRIPCIONES]: z.array(suscripcionSchema).optional(),
  [CLAVE_CALENDARIOS_DISPOSITIVO]: z.array(z.string()).optional(),
  [CLAVE_EVENTOS_OCULTOS]: z.array(z.string()).optional(),
  [CLAVE_TEMA]: z.enum(['light', 'dark', 'system']).optional(),
  [CLAVE_AVISOS]: z.boolean().optional(),
});

export type BackupSettings = z.infer<typeof settingsSchema>;

type Suscripciones = NonNullable<BackupSettings[typeof CLAVE_SUSCRIPCIONES]>;

const CLAVES_RESPALDADAS = Object.keys(settingsSchema.shape);

const backupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  nodes: z.array(nodeSchema),
  activities: z.array(activitySchema),
  settings: settingsSchema.optional(),
});

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  nodes: LuminaNode[];
  activities: Activity[];
  settings?: BackupSettings;
}

export type ImportMode = 'replace' | 'merge';

function registrosExistentes(registros: (SettingRecord | undefined)[]): SettingRecord[] {
  return registros.filter((registro) => registro !== undefined);
}

async function leerSettingsRespaldados(): Promise<BackupSettings> {
  const registros = registrosExistentes(await db.settings.bulkGet(CLAVES_RESPALDADAS));
  return Object.fromEntries(registros.map(({ key, value }) => [key, value])) as BackupSettings;
}

export async function exportBackup(): Promise<BackupFile> {
  const [nodes, activities, settings] = await Promise.all([
    db.nodes.toArray(),
    db.activities.toArray(),
    leerSettingsRespaldados(),
  ]);
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    nodes,
    activities,
    settings,
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

function unirSinRepetir(actuales?: string[], respaldo?: string[]): string[] | undefined {
  if (respaldo === undefined) return actuales;
  return [...new Set([...(actuales ?? []), ...respaldo])];
}

function unirPorId(actuales?: Suscripciones, respaldo?: Suscripciones): Suscripciones | undefined {
  if (respaldo === undefined) return actuales;
  const delRespaldo = new Map(respaldo.map((suscripcion) => [suscripcion.id, suscripcion]));
  const conservadas = (actuales ?? []).map((propia) => delRespaldo.get(propia.id) ?? propia);
  const idsConservados = new Set(conservadas.map(({ id }) => id));
  return [...conservadas, ...respaldo.filter(({ id }) => !idsConservados.has(id))];
}

function fusionarSettings(actuales: BackupSettings, respaldo: BackupSettings): BackupSettings {
  return {
    ...actuales,
    ...respaldo,
    [CLAVE_SUSCRIPCIONES]: unirPorId(
      actuales[CLAVE_SUSCRIPCIONES],
      respaldo[CLAVE_SUSCRIPCIONES],
    ),
    [CLAVE_CALENDARIOS_DISPOSITIVO]: unirSinRepetir(
      actuales[CLAVE_CALENDARIOS_DISPOSITIVO],
      respaldo[CLAVE_CALENDARIOS_DISPOSITIVO],
    ),
    [CLAVE_EVENTOS_OCULTOS]: unirSinRepetir(
      actuales[CLAVE_EVENTOS_OCULTOS],
      respaldo[CLAVE_EVENTOS_OCULTOS],
    ),
  };
}

function aRegistros(settings: BackupSettings): SettingRecord[] {
  return Object.entries(settings)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ key, value }));
}

// Un respaldo v1/v2 no trae ajustes: se dejan los del dispositivo como están.
async function aplicarSettings(
  respaldo: BackupSettings | undefined,
  mode: ImportMode,
): Promise<void> {
  if (respaldo === undefined) return;
  const finales =
    mode === 'replace' ? respaldo : fusionarSettings(await leerSettingsRespaldados(), respaldo);
  await db.settings.bulkDelete(CLAVES_RESPALDADAS);
  await db.settings.bulkPut(aRegistros(finales));
}

export async function importBackup(
  file: BackupFile,
  mode: ImportMode,
): Promise<{ nodos: number; actividades: number }> {
  return db.transaction('rw', db.nodes, db.activities, db.settings, async () => {
    if (mode === 'replace') {
      await db.nodes.clear();
      await db.activities.clear();
    }
    await db.nodes.bulkPut(file.nodes);
    await db.activities.bulkPut(file.activities);
    await aplicarSettings(file.settings, mode);
    return { nodos: file.nodes.length, actividades: file.activities.length };
  });
}

export function backupFileName(now = new Date()): string {
  const dia = now.toISOString().slice(0, 10);
  return `lumina-respaldo-${dia}.json`;
}
