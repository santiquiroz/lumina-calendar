import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';
import {
  agregarSuscripcion,
  importarIcs,
  listarSuscripciones,
  normalizarUrlIcs,
  olvidarSuscripciones,
  quitarSuscripcion,
  sincronizarSuscripciones,
  ventanaSincronizacion,
} from './calendarsRepo';
import { nodesRepo } from './nodesRepo';

const AHORA = new Date('2026-08-12T12:00:00.000Z');

function ics(eventos: { uid: string; titulo: string; inicio: string; fin: string }[]): string {
  const cuerpo = eventos
    .map(
      (evento) =>
        `BEGIN:VEVENT\r\nUID:${evento.uid}\r\nSUMMARY:${evento.titulo}\r\nDTSTART:${evento.inicio}\r\nDTEND:${evento.fin}\r\nEND:VEVENT`,
    )
    .join('\r\n');

  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Prueba//ES\r\n${cuerpo}\r\nEND:VCALENDAR`;
}

const UNA_REUNION = ics([
  { uid: 'evento-1', titulo: 'Reunión importada', inicio: '20260813T140000Z', fin: '20260813T150000Z' },
]);

function respuesta(texto: string, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, text: async () => texto }) as unknown as Response) as unknown as typeof fetch;
}

beforeEach(async () => {
  await db.nodes.clear();
  await db.activities.clear();
  await db.settings.clear();
});

describe('normalizarUrlIcs', () => {
  it('convierte webcal en https', () => {
    expect(normalizarUrlIcs('webcal://ejemplo.com/cal.ics')).toBe('https://ejemplo.com/cal.ics');
  });

  it('deja intacta una dirección https', () => {
    expect(normalizarUrlIcs(' https://ejemplo.com/cal.ics ')).toBe('https://ejemplo.com/cal.ics');
  });
});

describe('ventanaSincronizacion', () => {
  it('cubre un mes atrás y medio año adelante', () => {
    const { desde, hasta } = ventanaSincronizacion(AHORA);
    expect(new Date(desde) < AHORA).toBe(true);
    expect(new Date(hasta) > AHORA).toBe(true);
  });
});

describe('importarIcs', () => {
  it('crea los eventos del archivo como nodos externos', async () => {
    const resultado = await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);

    expect(resultado.creados).toBe(1);
    const nodos = await db.nodes.toArray();
    expect(nodos[0].text).toBe('Reunión importada');
    expect(nodos[0].source).toBe('ics');
    expect(nodos[0].externalCalendar).toBe('trabajo.ics');
  });

  it('reimportar el mismo archivo no duplica', async () => {
    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);
    const segunda = await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);

    expect(segunda.creados).toBe(0);
    expect(await db.nodes.count()).toBe(1);
  });

  it('actualiza el evento cuando cambió de hora en el origen', async () => {
    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);
    const movido = ics([
      { uid: 'evento-1', titulo: 'Reunión movida', inicio: '20260813T160000Z', fin: '20260813T170000Z' },
    ]);

    const resultado = await importarIcs(movido, 'trabajo.ics', AHORA);

    expect(resultado.actualizados).toBe(1);
    const nodo = (await db.nodes.toArray())[0];
    expect(nodo.text).toBe('Reunión movida');
    expect(nodo.schedule?.start).toBe('2026-08-13T16:00:00.000Z');
  });

  it('conserva las subtareas propias al reimportar', async () => {
    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);
    const importado = (await db.nodes.toArray())[0];
    await nodesRepo.create({ text: 'Preparar guion', parentId: importado.id });

    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);

    const subtareas = await nodesRepo.listSubtree(importado.id);
    expect(subtareas.map((n) => n.text)).toEqual(['Preparar guion']);
  });

  it('quita los eventos que desaparecieron del origen', async () => {
    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);
    const resultado = await importarIcs(ics([]), 'trabajo.ics', AHORA);

    expect(resultado.eliminados).toBe(1);
    expect(await nodesRepo.countBySource('ics')).toBe(0);
  });

  it('ignora los eventos fuera de la ventana sincronizada', async () => {
    const lejano = ics([
      { uid: 'lejano', titulo: 'Muy adelante', inicio: '20280101T140000Z', fin: '20280101T150000Z' },
    ]);

    expect((await importarIcs(lejano, 'trabajo.ics', AHORA)).creados).toBe(0);
  });
});

describe('suscripciones', () => {
  it('agrega, lista y quita', async () => {
    const suscripcion = await agregarSuscripcion('Trabajo', 'webcal://ejemplo.com/cal.ics');
    expect((await listarSuscripciones())[0].url).toBe('https://ejemplo.com/cal.ics');

    await quitarSuscripcion(suscripcion.id);
    expect(await listarSuscripciones()).toEqual([]);
  });

  it('sincroniza los eventos de cada suscripción', async () => {
    await agregarSuscripcion('Trabajo', 'https://ejemplo.com/cal.ics');
    const resultado = await sincronizarSuscripciones(respuesta(UNA_REUNION), AHORA);

    expect(resultado.creados).toBe(1);
    expect(await nodesRepo.countBySource('ics')).toBe(1);
  });

  it('una suscripción caída no borra lo que ya estaba', async () => {
    await agregarSuscripcion('Trabajo', 'https://ejemplo.com/cal.ics');
    await sincronizarSuscripciones(respuesta(UNA_REUNION), AHORA);

    const caida = vi.fn(async () => {
      throw new TypeError('sin red');
    }) as unknown as typeof fetch;

    await expect(sincronizarSuscripciones(caida, AHORA)).resolves.toBeDefined();
    expect(await nodesRepo.countBySource('ics')).toBe(1);
  });

  it('olvidar suscripciones quita también sus eventos', async () => {
    await agregarSuscripcion('Trabajo', 'https://ejemplo.com/cal.ics');
    await sincronizarSuscripciones(respuesta(UNA_REUNION), AHORA);

    expect(await olvidarSuscripciones()).toBe(1);
    expect(await listarSuscripciones()).toEqual([]);
    expect(await nodesRepo.countBySource('ics')).toBe(0);
  });
});
