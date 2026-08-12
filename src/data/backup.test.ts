import { beforeEach, describe, expect, it } from 'vitest';
import {
  BACKUP_SCHEMA_VERSION,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
} from './backup';
import { db } from './db';
import { nodesRepo } from './nodesRepo';

const VACIO = {
  schemaVersion: 1,
  exportedAt: '2026-08-12T00:00:00.000Z',
  nodes: [],
  activities: [],
};

beforeEach(async () => {
  await db.nodes.clear();
  await db.activities.clear();
});

describe('exportBackup', () => {
  it('incluye la versión de esquema y todos los nodos', async () => {
    await nodesRepo.create({ text: 'Idea' });
    const respaldo = await exportBackup();
    expect(respaldo.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(respaldo.nodes).toHaveLength(1);
    expect(respaldo.activities).toHaveLength(1);
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

describe('backupFileName', () => {
  it('incluye la fecha del respaldo', () => {
    expect(backupFileName(new Date('2026-08-12T10:00:00.000Z'))).toBe(
      'lumina-respaldo-2026-08-12.json',
    );
  });
});
