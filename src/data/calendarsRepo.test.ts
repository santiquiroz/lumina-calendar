import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('crea una instancia por repetición y reimportar la serie no la duplica', async () => {
    const semanal = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:clase@ejemplo.com',
      'SUMMARY:Clase',
      'DTSTART:20260803T140000Z',
      'DTEND:20260803T150000Z',
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const primera = await importarIcs(semanal, 'trabajo.ics', AHORA);
    const segunda = await importarIcs(semanal, 'trabajo.ics', AHORA);

    expect(primera.creados).toBe(4);
    expect(segunda).toEqual({ creados: 0, actualizados: 0, eliminados: 0 });
    const ids = (await db.nodes.toArray()).map((nodo) => nodo.externalId).sort();
    expect(ids).toEqual([
      'archivo:clase@ejemplo.com@2026-08-03T14:00:00.000Z',
      'archivo:clase@ejemplo.com@2026-08-05T14:00:00.000Z',
      'archivo:clase@ejemplo.com@2026-08-10T14:00:00.000Z',
      'archivo:clase@ejemplo.com@2026-08-12T14:00:00.000Z',
    ]);
  });

  it('una repetición movida en el origen conserva su nodo y sus subtareas', async () => {
    const diaria = (...extra: string[]) =>
      [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:diaria',
        'SUMMARY:Pausa',
        'DTSTART:20260813T140000Z',
        'RRULE:FREQ=DAILY;COUNT=2',
        'END:VEVENT',
        ...extra,
        'END:VCALENDAR',
      ].join('\r\n');
    await importarIcs(diaria(), 'trabajo.ics', AHORA);
    const nodos = await db.nodes.toArray();
    const segunda = nodos.find((nodo) => nodo.externalId === 'archivo:diaria@2026-08-14T14:00:00.000Z');
    const id = segunda?.id as string;
    await nodesRepo.create({ text: 'Estirar', parentId: id });

    const resultado = await importarIcs(
      diaria(
        'BEGIN:VEVENT',
        'UID:diaria',
        'RECURRENCE-ID:20260814T140000Z',
        'SUMMARY:Pausa',
        'DTSTART:20260814T170000Z',
        'END:VEVENT',
      ),
      'trabajo.ics',
      AHORA,
    );

    expect(resultado).toEqual({ creados: 0, actualizados: 1, eliminados: 0 });
    expect((await db.nodes.get(id))?.schedule?.start).toBe('2026-08-14T17:00:00.000Z');
    expect((await nodesRepo.listSubtree(id)).map((n) => n.text)).toEqual(['Estirar']);
  });

  it('ignora los eventos fuera de la ventana sincronizada', async () => {
    const lejano = ics([
      { uid: 'lejano', titulo: 'Muy adelante', inicio: '20280101T140000Z', fin: '20280101T150000Z' },
    ]);

    expect((await importarIcs(lejano, 'trabajo.ics', AHORA)).creados).toBe(0);
  });
});

describe('importarIcs con un fin que no es posterior al inicio', () => {
  const SIN_DURACION = ics([
    { uid: 'instante', titulo: 'Instante', inicio: '20260813T140000Z', fin: '20260813T140000Z' },
  ]);
  const DURACION_NEGATIVA = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Prueba//ES',
    'BEGIN:VEVENT',
    'UID:negativo',
    'SUMMARY:Negativo',
    'DTSTART:20260813T160000Z',
    'DURATION:-PT1H',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  it.each([
    ['DTEND igual a DTSTART', SIN_DURACION],
    ['DURATION negativa', DURACION_NEGATIVA],
  ])('guarda un horario que se puede volver a guardar (%s)', async (_caso, texto) => {
    await importarIcs(texto, 'trabajo.ics', AHORA);

    const [nodo] = await db.nodes.toArray();
    const horario = nodo.schedule as NonNullable<typeof nodo.schedule>;
    expect(new Date(horario.end).getTime()).toBeGreaterThan(new Date(horario.start).getTime());
    await expect(nodesRepo.update(nodo.id, { schedule: horario })).resolves.toBeUndefined();
  });
});

describe('eventos importados descartados o desaparecidos', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function importarConSubtarea() {
    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);
    const evento = (await db.nodes.toArray())[0];
    const subtarea = await nodesRepo.create({ text: 'Preparar guion', parentId: evento.id });
    return { evento, subtarea };
  }

  it('un evento que la persona descartó no vuelve al reimportar', async () => {
    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);
    const evento = (await db.nodes.toArray())[0];
    await nodesRepo.softDelete(evento.id);

    const resultado = await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);

    expect(resultado).toEqual({ creados: 0, actualizados: 0, eliminados: 0 });
    expect((await db.nodes.get(evento.id))?.deletedAt).not.toBeNull();
  });

  it('las subtareas se van con el evento que desapareció del origen y no quedan como ideas', async () => {
    const { evento, subtarea } = await importarConSubtarea();

    await importarIcs(ics([]), 'trabajo.ics', AHORA);

    const padre = await db.nodes.get(evento.id);
    expect(padre?.deletedAt).not.toBeNull();
    expect((await db.nodes.get(subtarea.id))?.deletedAt).toBe(padre?.deletedAt);
    expect(await nodesRepo.listIdeas()).toEqual([]);
  });

  it('al volver al origen, el evento regresa con sus subtareas', async () => {
    const { evento, subtarea } = await importarConSubtarea();
    await importarIcs(ics([]), 'trabajo.ics', AHORA);

    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);

    expect((await db.nodes.get(evento.id))?.deletedAt).toBeNull();
    expect((await db.nodes.get(subtarea.id))?.deletedAt).toBeNull();
    expect((await nodesRepo.listSubtree(evento.id)).map((n) => n.text)).toEqual(['Preparar guion']);
  });

  it('al volver al origen no revive una subtarea que la persona ya había descartado', async () => {
    const { evento, subtarea } = await importarConSubtarea();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-12T13:00:00.000Z'));
    const marcaSubtarea = await nodesRepo.softDelete(subtarea.id);
    vi.setSystemTime(new Date('2026-08-12T14:00:00.000Z'));
    await importarIcs(ics([]), 'trabajo.ics', AHORA);

    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);

    expect((await db.nodes.get(evento.id))?.deletedAt).toBeNull();
    expect((await db.nodes.get(subtarea.id))?.deletedAt).toBe(marcaSubtarea);
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

const OTRA_REUNION = ics([
  { uid: 'evento-2', titulo: 'Otra reunión', inicio: '20260814T140000Z', fin: '20260814T150000Z' },
]);

function porDireccion(textos: Record<string, string | null>): typeof fetch {
  return vi.fn(async (url: string) => {
    const texto = textos[url];
    if (texto === null || texto === undefined) throw new TypeError('sin red');
    return { ok: true, text: async () => texto } as unknown as Response;
  }) as unknown as typeof fetch;
}

async function textosVivos(): Promise<string[]> {
  const nodos = await db.nodes.toArray();
  return nodos
    .filter((nodo) => nodo.deletedAt === null)
    .map((nodo) => nodo.text)
    .sort();
}

describe('vías .ics independientes', () => {
  it('importar un segundo archivo conserva los eventos del primero', async () => {
    await importarIcs(UNA_REUNION, 'a.ics', AHORA);
    const resultado = await importarIcs(OTRA_REUNION, 'b.ics', AHORA);

    expect(resultado.eliminados).toBe(0);
    expect(await textosVivos()).toEqual(['Otra reunión', 'Reunión importada']);
  });

  it('sincronizar sin suscripciones no toca lo importado por archivo', async () => {
    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);

    const resultado = await sincronizarSuscripciones(respuesta(''), AHORA);

    expect(resultado.eliminados).toBe(0);
    expect(await nodesRepo.countBySource('ics')).toBe(1);
  });

  it('importar un archivo no borra los eventos de una suscripción', async () => {
    await agregarSuscripcion('Trabajo', 'https://ejemplo.com/cal.ics');
    await sincronizarSuscripciones(respuesta(UNA_REUNION), AHORA);

    const resultado = await importarIcs(OTRA_REUNION, 'personal.ics', AHORA);

    expect(resultado.eliminados).toBe(0);
    expect(await textosVivos()).toEqual(['Otra reunión', 'Reunión importada']);
  });

  it('olvidar suscripciones no borra los eventos de archivo', async () => {
    await importarIcs(OTRA_REUNION, 'personal.ics', AHORA);
    await agregarSuscripcion('Trabajo', 'https://ejemplo.com/cal.ics');
    await sincronizarSuscripciones(respuesta(UNA_REUNION), AHORA);

    expect(await olvidarSuscripciones()).toBe(1);
    expect(await textosVivos()).toEqual(['Otra reunión']);
  });

  it('con una suscripción caída, la que respondió concilia y la caída conserva lo suyo', async () => {
    await agregarSuscripcion('Trabajo', 'https://trabajo.ejemplo/cal.ics');
    await agregarSuscripcion('Casa', 'https://casa.ejemplo/cal.ics');
    await sincronizarSuscripciones(
      porDireccion({
        'https://trabajo.ejemplo/cal.ics': UNA_REUNION,
        'https://casa.ejemplo/cal.ics': OTRA_REUNION,
      }),
      AHORA,
    );

    const resultado = await sincronizarSuscripciones(
      porDireccion({ 'https://trabajo.ejemplo/cal.ics': ics([]), 'https://casa.ejemplo/cal.ics': null }),
      AHORA,
    );

    expect(resultado.eliminados).toBe(1);
    expect(await textosVivos()).toEqual(['Otra reunión']);
  });

  it('quitar una suscripción quita solo sus eventos', async () => {
    await importarIcs(OTRA_REUNION, 'personal.ics', AHORA);
    const trabajo = await agregarSuscripcion('Trabajo', 'https://ejemplo.com/cal.ics');
    await sincronizarSuscripciones(respuesta(UNA_REUNION), AHORA);

    await quitarSuscripcion(trabajo.id);

    expect(await textosVivos()).toEqual(['Otra reunión']);
  });

  it('empareja los eventos heredados sin recrearlos', async () => {
    await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);
    const [heredado] = await db.nodes.toArray();

    const resultado = await importarIcs(UNA_REUNION, 'trabajo.ics', AHORA);

    expect(heredado.externalId).toBe('archivo:evento-1');
    expect(resultado.creados).toBe(0);
    expect((await db.nodes.toArray()).map((nodo) => nodo.id)).toEqual([heredado.id]);
  });
});
