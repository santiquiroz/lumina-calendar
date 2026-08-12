import { describe, expect, it } from 'vitest';
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT_PX,
  heightForRange,
  horasVisibles,
  topForTime,
} from './TimelineGrid';

describe('posicionamiento en la línea de tiempo', () => {
  it('coloca las 10:00 a dos horas del inicio a las 8:00', () => {
    expect(topForTime('2026-08-12T10:00:00', 8)).toBe(2 * HOUR_HEIGHT_PX);
  });

  it('ubica la media hora a mitad de celda', () => {
    expect(topForTime('2026-08-12T10:30:00', 10)).toBe(HOUR_HEIGHT_PX / 2);
  });

  it('convierte hora y media en altura proporcional', () => {
    expect(heightForRange('2026-08-12T10:00:00', '2026-08-12T11:30:00')).toBe(1.5 * HOUR_HEIGHT_PX);
  });

  it('nunca devuelve alturas menores al bloque mínimo legible', () => {
    expect(heightForRange('2026-08-12T10:00:00', '2026-08-12T10:05:00')).toBe(24);
  });
});

describe('horasVisibles', () => {
  it('cubre la franja diurna configurada', () => {
    const horas = horasVisibles();
    expect(horas[0]).toBe(DAY_START_HOUR);
    expect(horas.at(-1)).toBe(DAY_END_HOUR);
  });
});
