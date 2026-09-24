import { beforeEach, describe, expect, it } from 'vitest';
import {
  BACKUP_SCHEMA_VERSION,
  BackupError,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
} from './backup';
import {
  agregarSuscripcion,
  CLAVE_CALENDARIOS_DISPOSITIVO,
  CLAVE_SUSCRIPCIONES,
  CLAVE_ULTIMA_SINCRONIZACION,
  importarIcs,
  listarSuscripciones,
} from './calendarsRepo';
import { db } from './db';
import { CLAVE_EVENTOS_OCULTOS, nodesRepo } from './nodesRepo';
import { CLAVE_AVISOS } from './notificationsRepo';
import { CLAVE_TEMA, settingsRepo } from './settingsRepo';
import { CLAVE_VERSION_DESCARTADA } from './updateRepo';

const VACIO = {
  schemaVersion: 1,
  exportedAt: '2026-08-12T00:00:00.000Z',
  nodes: [],
  activities: [],
};

const V2_SIN_SETTINGS = { ...VACIO, schemaVersion: 2 };

const AHORA = new Date('2026-08-12T12:00:00.000Z');

const UN_EVENTO_ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:evento-1',
  'SUMMARY:Reunión importada',
  'DTSTART:20260813T150000Z',
  'DTEND:20260813T160000Z',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

function v3ConAjustes(settings: Record<string, unknown>) {
  return parseBackup({ ...VACIO, schemaVersion: 3, settings });
}

async function exportarComoArchivo() {
  return parseBackup(JSON.parse(JSON.stringify(await exportBackup())));
}

async function limpiarTodo(): Promise<void> {
  await db.nodes.clear();
  await db.activities.clear();
  await db.settings.clear();
}

beforeEach(limpiarTodo);

describe('exportBackup', () => {
  it('incluye la versión de esquema y todos los nodos', async () => {
    await nodesRepo.create({ text: 'Idea' });
    const respaldo = await exportBackup();
    expect(respaldo.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(respaldo.nodes).toHaveLength(1);
    expect(respaldo.activities).toHaveLength(1);
  });

  it('incluye solo los ajustes de la lista blanca', async () => {
    await settingsRepo.set(CLAVE_TEMA, 'dark');
    await settingsRepo.set(CLAVE_ULTIMA_SINCRONIZACION, 123);
    await settingsRepo.set(CLAVE_VERSION_DESCARTADA, '9.9.9');

    const respaldo = await exportBackup();

    expect(respaldo.settings).toEqual({ [CLAVE_TEMA]: 'dark' });
  });
});

describe('parseBackup', () => {
  it('acepta un respaldo válido', () => {
    expect(parseBackup(VACIO).schemaVersion).toBe(1);
  });

  it('rechaza un objeto sin versión de esquema', () => {
    expect(() => parseBackup({ nodes: [], activities: [] })).toThrow(/formato/i);
  });

  it('rechaza una versión de esquema futura con un mensaje legible', () => {
    expect(() => parseBackup({ ...VACIO, schemaVersion: 99 })).toThrow(/versión/i);
  });

  it('rechaza nodos con forma inválida', () => {
    expect(() => parseBackup({ ...VACIO, nodes: [{ id: 'x' }] })).toThrow(/formato/i);
  });

  it('rechaza la versión de esquema 4 con BackupError', () => {
    expect(() => parseBackup({ ...VACIO, schemaVersion: 4 })).toThrow(BackupError);
  });

  it('acepta un respaldo v2 sin ajustes', () => {
    expect(parseBackup(V2_SIN_SETTINGS).settings).toBeUndefined();
  });

  it('ignora las claves de ajustes fuera de la lista blanca', () => {
    const respaldo = v3ConAjustes({ [CLAVE_TEMA]: 'dark', [CLAVE_VERSION_DESCARTADA]: '9.9.9' });
    expect(respaldo.settings).toEqual({ [CLAVE_TEMA]: 'dark' });
  });

  it('rechaza un ajuste de la lista blanca con un valor inválido', () => {
    expect(() => v3ConAjustes({ [CLAVE_TEMA]: 'violeta' })).toThrow(BackupError);
  });
});

describe('importBackup', () => {
  it('completa un ciclo export → clear → import sin pérdida', async () => {
    const raiz = await nodesRepo.create({ text: 'Raíz' });
    await nodesRepo.create({ text: 'Hijo', parentId: raiz.id });
    const original = await exportBackup();

    await db.nodes.clear();
    await db.activities.clear();
    await importBackup(original, 'replace');

    const recuperado = await exportBackup();
    expect(recuperado.nodes).toEqual(original.nodes);
    expect(recuperado.activities).toEqual(original.activities);
  });

  it('en modo replace descarta los datos previos', async () => {
    await nodesRepo.create({ text: 'Vieja' });
    await importBackup(VACIO, 'replace');
    expect(await db.nodes.count()).toBe(0);
  });

  it('en modo merge conserva los datos previos y no duplica por id', async () => {
    const existente = await nodesRepo.create({ text: 'Existente' });
    const respaldo = await exportBackup();
    await nodesRepo.create({ text: 'Nueva' });

    await importBackup(respaldo, 'merge');

    expect(await db.nodes.count()).toBe(2);
    expect((await db.nodes.get(existente.id))?.text).toBe('Existente');
  });
});

describe('importBackup con ajustes', () => {
  it('en modo replace restaura suscripciones, tema y avisos', async () => {
    const suscripcion = await agregarSuscripcion('Feriados', 'webcal://ejemplo.com/feriados.ics');
    await settingsRepo.set(CLAVE_TEMA, 'dark');
    await settingsRepo.set(CLAVE_AVISOS, false);
    const respaldo = await exportarComoArchivo();

    await limpiarTodo();
    await importBackup(respaldo, 'replace');

    expect(await listarSuscripciones()).toEqual([suscripcion]);
    expect(await settingsRepo.get(CLAVE_TEMA, 'system')).toBe('dark');
    expect(await settingsRepo.get(CLAVE_AVISOS, true)).toBe(false);
  });

  it('en modo replace quita los ajustes de la lista blanca que el respaldo no trae', async () => {
    await agregarSuscripcion('Vieja', 'https://ejemplo.com/vieja.ics');
    await settingsRepo.set(CLAVE_ULTIMA_SINCRONIZACION, 123);

    await importBackup(v3ConAjustes({}), 'replace');

    expect(await listarSuscripciones()).toEqual([]);
    expect(await settingsRepo.get(CLAVE_ULTIMA_SINCRONIZACION, 0)).toBe(123);
  });

  it('un respaldo v2 sin ajustes importa y no toca los ajustes actuales', async () => {
    const suscripcion = await agregarSuscripcion('Feriados', 'https://ejemplo.com/feriados.ics');
    await settingsRepo.set(CLAVE_TEMA, 'dark');
    await nodesRepo.create({ text: 'Vieja' });

    await importBackup(parseBackup(V2_SIN_SETTINGS), 'replace');

    expect(await db.nodes.count()).toBe(0);
    expect(await listarSuscripciones()).toEqual([suscripcion]);
    expect(await settingsRepo.get(CLAVE_TEMA, 'system')).toBe('dark');
  });

  it('no guarda las claves fuera de la lista blanca', async () => {
    const respaldo = v3ConAjustes({ [CLAVE_TEMA]: 'dark', [CLAVE_VERSION_DESCARTADA]: '9.9.9' });

    await importBackup(respaldo, 'replace');

    expect(await db.settings.get(CLAVE_VERSION_DESCARTADA)).toBeUndefined();
    expect(await settingsRepo.get(CLAVE_TEMA, 'system')).toBe('dark');
  });

  it('en modo merge une las listas y toma del respaldo los valores sueltos', async () => {
    const propia = await agregarSuscripcion('Propia', 'https://ejemplo.com/propia.ics');
    await settingsRepo.set(CLAVE_TEMA, 'light');
    await settingsRepo.set(CLAVE_AVISOS, false);
    const ajena = { id: 'sub-ajena', nombre: 'Ajena', url: 'https://ejemplo.com/ajena.ics' };
    const respaldo = v3ConAjustes({
      [CLAVE_SUSCRIPCIONES]: [ajena],
      [CLAVE_TEMA]: 'dark',
    });

    await importBackup(respaldo, 'merge');

    expect(await listarSuscripciones()).toEqual([propia, ajena]);
    expect(await settingsRepo.get(CLAVE_TEMA, 'system')).toBe('dark');
    expect(await settingsRepo.get(CLAVE_AVISOS, true)).toBe(false);
  });

  it('no exporta los calendarios del teléfono: sus ids son locales de cada dispositivo', async () => {
    await settingsRepo.set(CLAVE_CALENDARIOS_DISPOSITIVO, ['3']);

    const respaldo = await exportarComoArchivo();

    expect(respaldo.settings).not.toHaveProperty(CLAVE_CALENDARIOS_DISPOSITIVO);
  });

  it.each(['replace', 'merge'] as const)(
    'en modo %s ignora los calendarios del teléfono que trae el respaldo y conserva los propios',
    async (modo) => {
      await settingsRepo.set(CLAVE_CALENDARIOS_DISPOSITIVO, ['3']);
      const deOtroTelefono = v3ConAjustes({ [CLAVE_CALENDARIOS_DISPOSITIVO]: ['1', '7'] });

      await importBackup(deOtroTelefono, modo);

      expect(await settingsRepo.get(CLAVE_CALENDARIOS_DISPOSITIVO, [])).toEqual(['3']);
    },
  );

  it('en modo merge reemplaza por id la suscripción que ya existía', async () => {
    const propia = await agregarSuscripcion('Nombre viejo', 'https://ejemplo.com/propia.ics');
    const renombrada = { ...propia, nombre: 'Nombre nuevo' };

    await importBackup(v3ConAjustes({ [CLAVE_SUSCRIPCIONES]: [renombrada] }), 'merge');

    expect(await listarSuscripciones()).toEqual([renombrada]);
  });

  it('un evento descartado no vuelve tras restaurar el respaldo y reimportar', async () => {
    await importarIcs(UN_EVENTO_ICS, 'trabajo.ics', AHORA);
    const [evento] = await db.nodes.toArray();
    await nodesRepo.softDelete(evento.id);
    const respaldo = await exportarComoArchivo();

    await limpiarTodo();
    await importBackup(respaldo, 'replace');
    await importarIcs(UN_EVENTO_ICS, 'trabajo.ics', AHORA);

    expect(await settingsRepo.get(CLAVE_EVENTOS_OCULTOS, [])).toEqual([evento.externalId]);
    expect((await db.nodes.get(evento.id))?.deletedAt).not.toBeNull();
  });
});

describe('backupFileName', () => {
  it('incluye la fecha del respaldo', () => {
    expect(backupFileName(new Date('2026-08-12T10:00:00.000Z'))).toBe(
      'lumina-respaldo-2026-08-12.json',
    );
  });
});
