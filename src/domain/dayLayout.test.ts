import { describe, expect, it } from 'vitest';
import { buildNode } from '@/test/factories';
import { layoutDay, type DayBlock, type DayGrid } from './dayLayout';

const GRILLA: DayGrid = { startHour: 6, endHour: 24, hourHeightPx: 64, minBlockPx: 24 };
const DIA = '2026-08-12';
const ALTO_GRILLA = (GRILLA.endHour - GRILLA.startHour) * GRILLA.hourHeightPx;

function local(dia: number, hora: number, minutos = 0): string {
  return new Date(2026, 7, dia, hora, minutos).toISOString();
}

function evento(id: string, start: string, end: string, allDay = false) {
  return buildNode({ id, text: id, schedule: { start, end, allDay } });
}

function bloqueDe(bloques: DayBlock[], id: string): DayBlock {
  const bloque = bloques.find((b) => b.node.id === id);
  if (!bloque) throw new Error(`sin bloque para ${id}`);
  return bloque;
}

describe('layoutDay', () => {
  it('manda los eventos de todo el día a la franja y no a la grilla', () => {
    const festivo = evento('festivo', local(12, 0), local(13, 0), true);
    const reunion = evento('reunion', local(12, 10), local(12, 11));

    const { allDay, blocks } = layoutDay([festivo, reunion], DIA, GRILLA);

    expect(allDay.map((n) => n.id)).toEqual(['festivo']);
    expect(blocks.map((b) => b.node.id)).toEqual(['reunion']);
  });

  it('trata como de todo el día un evento de varios días que cubre el día entero', () => {
    const congreso = evento('congreso', local(11, 9), local(13, 18));

    const { allDay, blocks } = layoutDay([congreso], DIA, GRILLA);

    expect(allDay.map((n) => n.id)).toEqual(['congreso']);
    expect(blocks).toHaveLength(0);
  });

  it('ubica un evento proporcional a su hora dentro de la grilla', () => {
    const { blocks } = layoutDay([evento('e', local(12, 10), local(12, 11, 30))], DIA, GRILLA);

    expect(bloqueDe(blocks, 'e')).toMatchObject({
      top: 4 * 64,
      height: 1.5 * 64,
      left: 0,
      width: 1,
    });
  });

  it('un evento de 22:00 a 02:00 visto el segundo día empieza en el borde superior', () => {
    const { blocks } = layoutDay([evento('noche', local(11, 22), local(12, 2))], DIA, GRILLA);

    expect(bloqueDe(blocks, 'noche').top).toBe(0);
  });

  it('recorta al inicio de la grilla lo que empieza de madrugada', () => {
    const { blocks } = layoutDay([evento('temprano', local(12, 4), local(12, 7))], DIA, GRILLA);

    expect(bloqueDe(blocks, 'temprano')).toMatchObject({ top: 0, height: 64 });
  });

  it('recorta al final del día lo que sigue después de medianoche', () => {
    const { blocks } = layoutDay([evento('tarde', local(12, 22), local(13, 3))], DIA, GRILLA);

    const bloque = bloqueDe(blocks, 'tarde');
    expect(bloque.top).toBe(16 * 64);
    expect(bloque.top + bloque.height).toBe(ALTO_GRILLA);
  });

  it('no deja que un bloque mínimo se salga por debajo de la grilla', () => {
    const { blocks } = layoutDay([evento('ultimo', local(12, 23, 55), local(13, 0))], DIA, GRILLA);

    const bloque = bloqueDe(blocks, 'ultimo');
    expect(bloque.height).toBe(GRILLA.minBlockPx);
    expect(bloque.top + bloque.height).toBe(ALTO_GRILLA);
  });

  it('da columnas distintas y medio ancho a dos eventos solapados', () => {
    const a = evento('a', local(12, 10), local(12, 11));
    const b = evento('b', local(12, 10, 30), local(12, 11, 30));

    const { blocks } = layoutDay([a, b], DIA, GRILLA);

    expect(bloqueDe(blocks, 'a')).toMatchObject({ left: 0, width: 0.5 });
    expect(bloqueDe(blocks, 'b')).toMatchObject({ left: 0.5, width: 0.5 });
  });

  it('deja ancho completo a eventos que solo se tocan en el borde', () => {
    const a = evento('a', local(12, 10), local(12, 11));
    const b = evento('b', local(12, 11), local(12, 12));

    const { blocks } = layoutDay([a, b], DIA, GRILLA);

    expect(bloqueDe(blocks, 'a')).toMatchObject({ left: 0, width: 1 });
    expect(bloqueDe(blocks, 'b')).toMatchObject({ left: 0, width: 1 });
  });

  it('reutiliza una columna libre dentro del mismo grupo de solapados', () => {
    const largo = evento('largo', local(12, 9), local(12, 12));
    const primero = evento('primero', local(12, 9), local(12, 10));
    const segundo = evento('segundo', local(12, 10, 30), local(12, 11));

    const { blocks } = layoutDay([primero, segundo, largo], DIA, GRILLA);

    expect(bloqueDe(blocks, 'largo')).toMatchObject({ left: 0, width: 0.5 });
    expect(bloqueDe(blocks, 'primero')).toMatchObject({ left: 0.5, width: 0.5 });
    expect(bloqueDe(blocks, 'segundo')).toMatchObject({ left: 0.5, width: 0.5 });
  });

  it('separa en columnas los bloques mínimos que se tapan aunque no se crucen en el tiempo', () => {
    const a = evento('a', local(12, 10), local(12, 10, 5));
    const b = evento('b', local(12, 10, 10), local(12, 10, 15));

    const { blocks } = layoutDay([a, b], DIA, GRILLA);

    expect(bloqueDe(blocks, 'a').left).not.toBe(bloqueDe(blocks, 'b').left);
  });

  it('nunca ubica un evento del día por encima de la grilla', () => {
    const nodos = [
      evento('madrugada', local(12, 0, 30), local(12, 1)),
      evento('cruza', local(11, 20), local(12, 9)),
      evento('mañana', local(12, 8), local(12, 9)),
      evento('noche', local(12, 23), local(13, 1)),
    ];

    const { blocks } = layoutDay(nodos, DIA, GRILLA);

    expect(blocks).toHaveLength(4);
    for (const bloque of blocks) {
      expect(bloque.top).toBeGreaterThanOrEqual(0);
      expect(bloque.top + bloque.height).toBeLessThanOrEqual(ALTO_GRILLA);
    }
  });

  it('ignora los nodos sin horario', () => {
    const { allDay, blocks } = layoutDay([buildNode({ id: 'idea' })], DIA, GRILLA);

    expect(allDay).toHaveLength(0);
    expect(blocks).toHaveLength(0);
  });
});
