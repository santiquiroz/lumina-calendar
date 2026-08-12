import { beforeEach, describe, expect, it } from 'vitest';
import { buildSchedule } from '@/test/factories';
import { activityRepo } from './activityRepo';
import { db } from './db';
import { nodesRepo } from './nodesRepo';

beforeEach(async () => {
  await db.nodes.clear();
  await db.activities.clear();
});

describe('nodesRepo.create', () => {
  it('crea una idea sin horario y registra la captura', async () => {
    const idea = await nodesRepo.create({ text: 'Llamar al banco' });
    expect(idea.schedule).toBeNull();
    expect(idea.parentId).toBeNull();
    expect((await activityRepo.listAll()).map((a) => a.type)).toEqual(['capture']);
  });

  it('asigna claves de orden crecientes a hermanos sucesivos', async () => {
    const padre = await nodesRepo.create({ text: 'Evento' });
    const primero = await nodesRepo.create({ text: 'A', parentId: padre.id });
    const segundo = await nodesRepo.create({ text: 'B', parentId: padre.id });
    expect(primero.order < segundo.order).toBe(true);
  });

  it('inserta entre dos hermanos con afterId', async () => {
    const padre = await nodesRepo.create({ text: 'Evento' });
    const primero = await nodesRepo.create({ text: 'A', parentId: padre.id });
    const tercero = await nodesRepo.create({ text: 'C', parentId: padre.id });
    const segundo = await nodesRepo.create({
      text: 'B',
      parentId: padre.id,
      afterId: primero.id,
    });
    expect(primero.order < segundo.order).toBe(true);
    expect(segundo.order < tercero.order).toBe(true);
  });

  it('registra también la programación cuando nace con horario', async () => {
    await nodesRepo.create({
      text: 'Reunión',
      schedule: buildSchedule('2026-08-13T14:00:00.000Z', 60),
    });
    const tipos = (await activityRepo.listAll()).map((a) => a.type);
    expect(tipos).toEqual(['capture', 'schedule']);
  });
});

describe('nodesRepo.toggleDone', () => {
  it('marca completado, guarda la fecha y registra la actividad', async () => {
    const nodo = await nodesRepo.create({ text: 'Tarea' });
    await nodesRepo.toggleDone(nodo.id);
    const guardado = await db.nodes.get(nodo.id);
    expect(guardado?.done).toBe(true);
    expect(guardado?.completedAt).not.toBeNull();
    expect((await activityRepo.listAll()).map((a) => a.type)).toContain('complete');
  });

  it('al desmarcar limpia la fecha de completado y no registra actividad nueva', async () => {
    const nodo = await nodesRepo.create({ text: 'Tarea' });
    await nodesRepo.toggleDone(nodo.id);
    await nodesRepo.toggleDone(nodo.id);
    const guardado = await db.nodes.get(nodo.id);
    expect(guardado?.done).toBe(false);
    expect(guardado?.completedAt).toBeNull();
    expect((await activityRepo.listAll()).filter((a) => a.type === 'complete')).toHaveLength(1);
  });

  it('falla con NOT_FOUND si el nodo no existe', async () => {
    await expect(nodesRepo.toggleDone('fantasma')).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    );
  });
});

describe('nodesRepo.schedule', () => {
  it('convierte una idea en evento sin crear un nodo nuevo', async () => {
    const idea = await nodesRepo.create({ text: 'Estudiar' });
    await nodesRepo.schedule(idea.id, buildSchedule('2026-08-13T14:00:00.000Z', 60));

    const guardado = await db.nodes.get(idea.id);
    expect(guardado?.id).toBe(idea.id);
    expect(guardado?.schedule?.start).toBe('2026-08-13T14:00:00.000Z');
    expect(await db.nodes.count()).toBe(1);
    expect((await activityRepo.listAll()).map((a) => a.type)).toContain('schedule');
  });

  it('rechaza un horario que termina antes de empezar', async () => {
    const idea = await nodesRepo.create({ text: 'Estudiar' });
    await expect(
      nodesRepo.schedule(idea.id, {
        start: '2026-08-13T15:00:00.000Z',
        end: '2026-08-13T14:00:00.000Z',
        allDay: false,
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_SCHEDULE' }));
  });

  it('permite devolver un evento al canvas quitándole el horario', async () => {
    const evento = await nodesRepo.create({
      text: 'Reunión',
      schedule: buildSchedule('2026-08-13T14:00:00.000Z', 60),
    });
    await nodesRepo.schedule(evento.id, null);
    expect((await db.nodes.get(evento.id))?.schedule).toBeNull();
  });
});

describe('nodesRepo.move', () => {
  it('reasigna el padre y conserva un orden válido', async () => {
    const a = await nodesRepo.create({ text: 'A' });
    const b = await nodesRepo.create({ text: 'B' });
    await nodesRepo.move(b.id, a.id);
    expect((await db.nodes.get(b.id))?.parentId).toBe(a.id);
  });

  it('rechaza mover un nodo dentro de su propio subárbol', async () => {
    const raiz = await nodesRepo.create({ text: 'Raíz' });
    const hijo = await nodesRepo.create({ text: 'Hijo', parentId: raiz.id });
    await expect(nodesRepo.move(raiz.id, hijo.id)).rejects.toThrow(
      expect.objectContaining({ code: 'CYCLE' }),
    );
  });

  it('rechaza un movimiento que supera la profundidad máxima', async () => {
    let padreId: string | null = null;
    for (let i = 0; i <= 20; i += 1) {
      const nodo = await nodesRepo.create({ text: `Nivel ${i}`, parentId: padreId });
      padreId = nodo.id;
    }
    const suelto = await nodesRepo.create({ text: 'Suelto' });
    await expect(nodesRepo.move(suelto.id, padreId)).rejects.toThrow(
      expect.objectContaining({ code: 'MAX_DEPTH' }),
    );
  });
});

describe('nodesRepo.softDelete y restore', () => {
  it('borra el subárbol completo y lo restaura entero', async () => {
    const raiz = await nodesRepo.create({ text: 'Raíz' });
    const hijo = await nodesRepo.create({ text: 'Hijo', parentId: raiz.id });

    await nodesRepo.softDelete(raiz.id);
    expect((await db.nodes.get(hijo.id))?.deletedAt).not.toBeNull();

    await nodesRepo.restore(raiz.id);
    expect((await db.nodes.get(hijo.id))?.deletedAt).toBeNull();
  });

  it('no restaura un subárbol borrado en otro momento', async () => {
    const primero = await nodesRepo.create({ text: 'Primero' });
    await nodesRepo.softDelete(primero.id);
    const marcaPrimera = (await db.nodes.get(primero.id))?.deletedAt;

    const segundo = await nodesRepo.create({ text: 'Segundo' });
    await nodesRepo.softDelete(segundo.id);

    await nodesRepo.restore(segundo.id);
    expect((await db.nodes.get(primero.id))?.deletedAt).toBe(marcaPrimera);
  });
});

describe('nodesRepo.listByDay', () => {
  it('devuelve solo los eventos que solapan el día pedido', async () => {
    const dentro = await nodesRepo.create({
      text: 'Reunión',
      schedule: buildSchedule('2026-08-13T09:00:00', 60),
    });
    await nodesRepo.create({
      text: 'Otro día',
      schedule: buildSchedule('2026-08-14T09:00:00', 60),
    });
    await nodesRepo.create({ text: 'Idea sin fecha' });

    expect((await nodesRepo.listByDay('2026-08-13')).map((n) => n.id)).toEqual([dentro.id]);
  });

  it('ordena los eventos del día por hora de inicio', async () => {
    const tarde = await nodesRepo.create({
      text: 'Tarde',
      schedule: buildSchedule('2026-08-13T16:00:00', 60),
    });
    const manana = await nodesRepo.create({
      text: 'Mañana',
      schedule: buildSchedule('2026-08-13T08:00:00', 60),
    });
    expect((await nodesRepo.listByDay('2026-08-13')).map((n) => n.id)).toEqual([
      manana.id,
      tarde.id,
    ]);
  });
});

describe('nodesRepo.listIdeas', () => {
  it('devuelve solo raíces sin horario', async () => {
    const idea = await nodesRepo.create({ text: 'Idea' });
    await nodesRepo.create({
      text: 'Evento',
      schedule: buildSchedule('2026-08-13T09:00:00.000Z', 60),
    });
    expect((await nodesRepo.listIdeas()).map((n) => n.id)).toEqual([idea.id]);
  });

  it('excluye las ideas borradas', async () => {
    const idea = await nodesRepo.create({ text: 'Idea' });
    await nodesRepo.softDelete(idea.id);
    expect(await nodesRepo.listIdeas()).toEqual([]);
  });
});

describe('nodesRepo.search', () => {
  it('busca sin distinguir mayúsculas ni acentos', async () => {
    await nodesRepo.create({ text: 'Revisión de diseño' });
    expect(await nodesRepo.search('revision')).toHaveLength(1);
  });

  it('devuelve vacío con una consulta en blanco', async () => {
    await nodesRepo.create({ text: 'Revisión' });
    expect(await nodesRepo.search('   ')).toHaveLength(0);
  });

  it('excluye los nodos borrados', async () => {
    const nodo = await nodesRepo.create({ text: 'Revisión' });
    await nodesRepo.softDelete(nodo.id);
    expect(await nodesRepo.search('revisión')).toHaveLength(0);
  });
});
