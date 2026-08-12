import { describe, expect, it } from 'vitest';
import { buildSchedule } from '@/test/factories';
import {
  AMBER_MAX_MS,
  AMBER_MIN_MS,
  amberThresholdMs,
  formatRemaining,
  remainingMs,
  remainingRatio,
  timeState,
} from './time';
import type { Schedule } from './types';

const MINUTO = 60_000;
const INICIO = '2026-08-12T14:00:00.000Z';

describe('amberThresholdMs', () => {
  it('usa el 20 % de la duración en bloques medianos', () => {
    expect(amberThresholdMs(30 * MINUTO)).toBe(6 * MINUTO);
  });

  it('tapa el umbral en 15 minutos para bloques largos', () => {
    expect(amberThresholdMs(8 * 60 * MINUTO)).toBe(AMBER_MAX_MS);
  });

  it('no baja de un minuto en bloques muy cortos', () => {
    expect(amberThresholdMs(2 * MINUTO)).toBe(AMBER_MIN_MS);
  });
});

describe('timeState', () => {
  it('marca upcoming antes del comienzo', () => {
    expect(timeState(buildSchedule(INICIO, 60), new Date('2026-08-12T13:59:00.000Z'))).toBe(
      'upcoming',
    );
  });

  it('marca calm en la primera mitad', () => {
    expect(timeState(buildSchedule(INICIO, 60), new Date('2026-08-12T14:10:00.000Z'))).toBe('calm');
  });

  it('marca amber dentro del umbral relativo de un bloque de 60 min', () => {
    expect(timeState(buildSchedule(INICIO, 60), new Date('2026-08-12T14:50:00.000Z'))).toBe(
      'amber',
    );
  });

  it('marca calm a 15 min del final de un bloque de 8 h y amber justo después', () => {
    const largo = buildSchedule(INICIO, 8 * 60);
    expect(timeState(largo, new Date('2026-08-12T21:44:00.000Z'))).toBe('calm');
    expect(timeState(largo, new Date('2026-08-12T21:46:00.000Z'))).toBe('amber');
  });

  it('no entra en amber demasiado pronto en un bloque de 15 min', () => {
    const corto = buildSchedule(INICIO, 15);
    expect(timeState(corto, new Date('2026-08-12T14:11:00.000Z'))).toBe('calm');
    expect(timeState(corto, new Date('2026-08-12T14:12:30.000Z'))).toBe('amber');
  });

  it('marca ended después del final', () => {
    expect(timeState(buildSchedule(INICIO, 60), new Date('2026-08-12T15:00:01.000Z'))).toBe(
      'ended',
    );
  });

  it('trata los eventos de día completo como calm mientras dure el día', () => {
    const diaCompleto: Schedule = {
      start: '2026-08-12T00:00:00.000Z',
      end: '2026-08-13T00:00:00.000Z',
      allDay: true,
    };
    expect(timeState(diaCompleto, new Date('2026-08-12T23:59:00.000Z'))).toBe('calm');
  });
});

describe('remainingMs y remainingRatio', () => {
  it('nunca devuelve valores negativos', () => {
    expect(remainingMs(buildSchedule(INICIO, 30), new Date('2026-08-12T18:00:00.000Z'))).toBe(0);
  });

  it('devuelve la mitad del bloque a mitad de camino', () => {
    expect(remainingRatio(buildSchedule(INICIO, 60), new Date('2026-08-12T14:30:00.000Z'))).toBe(
      0.5,
    );
  });

  it('no supera 1 antes de empezar', () => {
    expect(remainingRatio(buildSchedule(INICIO, 60), new Date('2026-08-12T13:00:00.000Z'))).toBe(1);
  });
});

describe('formatRemaining', () => {
  it('expresa minutos en bloques cortos', () => {
    expect(formatRemaining(buildSchedule(INICIO, 60), new Date('2026-08-12T14:15:00.000Z'))).toBe(
      '45 min restantes',
    );
  });

  it('expresa horas y minutos en bloques largos', () => {
    expect(formatRemaining(buildSchedule(INICIO, 150), new Date('2026-08-12T14:00:00.000Z'))).toBe(
      '2 h 30 min restantes',
    );
  });

  it('expresa horas exactas sin minutos', () => {
    expect(formatRemaining(buildSchedule(INICIO, 120), new Date('2026-08-12T14:00:00.000Z'))).toBe(
      '2 h restantes',
    );
  });

  it('no usa vocabulario de culpa al terminar', () => {
    const texto = formatRemaining(buildSchedule(INICIO, 30), new Date('2026-08-12T20:00:00.000Z'));
    expect(texto).toBe('Terminado');
    expect(texto).not.toMatch(/vencid|atrasad|fallast/i);
  });
});
