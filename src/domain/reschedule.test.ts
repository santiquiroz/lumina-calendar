import { describe, expect, it } from 'vitest';
import {
  cambiaElInicio,
  desplazarHorario,
  horarioArrastrado,
  minutosPorDesplazamiento,
  pixelesEntre,
} from './reschedule';
import type { Schedule } from './types';

const GRILLA = { hourHeightPx: 64, stepMinutes: 15 };

function alas(hora: number, minutos = 0, dia = 15): string {
  return new Date(2026, 8, dia, hora, minutos).toISOString();
}

function horario(inicio: string, fin: string): Schedule {
  return { start: inicio, end: fin, allDay: false };
}

describe('minutosPorDesplazamiento', () => {
  it('convierte una hora de grilla en sesenta minutos', () => {
    expect(minutosPorDesplazamiento(64, GRILLA)).toBe(60);
    expect(minutosPorDesplazamiento(-64, GRILLA)).toBe(-60);
  });

  it('redondea al paso de quince minutos más cercano', () => {
    expect(minutosPorDesplazamiento(7, GRILLA)).toBe(0);
    expect(minutosPorDesplazamiento(9, GRILLA)).toBe(15);
    expect(minutosPorDesplazamiento(40, GRILLA)).toBe(45);
    expect(minutosPorDesplazamiento(-25, GRILLA)).toBe(-30);
  });
});

describe('desplazarHorario', () => {
  it('mueve el inicio y conserva la duración', () => {
    const antes = horario(alas(9, 10), alas(10, 40));

    const despues = desplazarHorario(antes, 45);

    expect(despues).toEqual(horario(alas(9, 55), alas(11, 25)));
  });

  it('conserva el resto del horario', () => {
    const antes: Schedule = { start: alas(9), end: alas(10), allDay: false };

    expect(desplazarHorario(antes, 15).allDay).toBe(false);
  });

  it('no deja que el bloque termine después de la medianoche', () => {
    const antes = horario(alas(22), alas(23, 30));

    expect(desplazarHorario(antes, 120)).toEqual(horario(alas(22, 30), alas(0, 0, 16)));
  });

  it('no deja que el bloque empiece antes de la medianoche del mismo día', () => {
    const antes = horario(alas(0, 30), alas(1, 30));

    expect(desplazarHorario(antes, -60)).toEqual(horario(alas(0), alas(1)));
  });

  it('deja quieto hacia adelante un bloque que ya cruza la medianoche', () => {
    const antes = horario(alas(23), alas(1, 0, 16));

    expect(desplazarHorario(antes, 30)).toEqual(antes);
    expect(desplazarHorario(antes, -60)).toEqual(horario(alas(22), alas(0, 0, 16)));
  });
});

describe('horarioArrastrado', () => {
  it('lleva +64 px a una hora más tarde', () => {
    const antes = horario(alas(10), alas(11));

    expect(horarioArrastrado(antes, 64, GRILLA)).toEqual(horario(alas(11), alas(12)));
  });

  it('lleva un desplazamiento menor que medio paso al mismo horario', () => {
    const antes = horario(alas(10), alas(11));

    expect(cambiaElInicio(antes, horarioArrastrado(antes, 5, GRILLA))).toBe(false);
  });
});

describe('cambiaElInicio', () => {
  it('compara instantes y no el texto del ISO', () => {
    const antes = horario('2026-09-15T15:00:00.000Z', '2026-09-15T16:00:00.000Z');
    const igual = horario('2026-09-15T10:00:00-05:00', '2026-09-15T11:00:00-05:00');

    expect(cambiaElInicio(antes, igual)).toBe(false);
    expect(cambiaElInicio(antes, horario(alas(11), alas(12)))).toBe(true);
  });
});

describe('pixelesEntre', () => {
  it('convierte la diferencia de inicios a píxeles de grilla', () => {
    const antes = horario(alas(10), alas(11));

    expect(pixelesEntre(antes, horario(alas(11, 15), alas(12, 15)), 64)).toBe(80);
    expect(pixelesEntre(antes, horario(alas(9, 30), alas(10, 30)), 64)).toBe(-32);
  });
});
