import { describe, expect, it } from 'vitest';
import { buildNode, buildSchedule } from '@/test/factories';
import { allReminders, reminderId, remindersFor, REMINDER_WINDOW_DAYS } from './reminders';

const AHORA = new Date('2026-08-12T08:00:00.000Z');

function eventoDe(minutos: number, desdeIso = '2026-08-12T14:00:00.000Z') {
  return buildNode({ text: 'Reunión', schedule: buildSchedule(desdeIso, minutos) });
}

describe('reminderId', () => {
  it('es estable para el mismo nodo y tipo', () => {
    expect(reminderId('abc', 'inicio')).toBe(reminderId('abc', 'inicio'));
  });

  it('distingue el aviso de inicio del de ámbar', () => {
    expect(reminderId('abc', 'inicio')).not.toBe(reminderId('abc', 'ambar'));
  });

  it('distingue nodos distintos', () => {
    expect(reminderId('abc', 'inicio')).not.toBe(reminderId('abd', 'inicio'));
  });

  it('cabe en un entero positivo de 32 bits', () => {
    const id = reminderId('9f1c8f60-1f2e-4c3a-9a44-2b0f5f0c1d77', 'ambar');
    expect(Number.isInteger(id)).toBe(true);
    expect(id).toBeGreaterThan(0);
    expect(id).toBeLessThan(2 ** 31);
  });
});

describe('remindersFor', () => {
  it('programa el arranque y el aviso ámbar', () => {
    const avisos = remindersFor(eventoDe(60), AHORA);
    expect(avisos.map((a) => a.kind)).toEqual(['inicio', 'ambar']);
  });

  it('el aviso ámbar respeta el umbral proporcional', () => {
    const [, ambar] = remindersFor(eventoDe(60), AHORA);
    expect(ambar.at.toISOString()).toBe('2026-08-12T14:48:00.000Z');
    expect(ambar.cuerpo).toContain('12 min');
  });

  it('en un bloque largo el aviso ámbar se topa en 15 minutos', () => {
    const [, ambar] = remindersFor(eventoDe(8 * 60), AHORA);
    expect(ambar.at.toISOString()).toBe('2026-08-12T21:45:00.000Z');
  });

  it('no programa nada para un evento ya completado', () => {
    const nodo = { ...eventoDe(60), done: true };
    expect(remindersFor(nodo, AHORA)).toEqual([]);
  });

  it('no programa nada para un evento borrado', () => {
    const nodo = { ...eventoDe(60), deletedAt: '2026-08-12T09:00:00.000Z' };
    expect(remindersFor(nodo, AHORA)).toEqual([]);
  });

  it('no programa nada para un nodo sin horario', () => {
    expect(remindersFor(buildNode({ text: 'Idea' }), AHORA)).toEqual([]);
  });

  it('no molesta con eventos de día completo', () => {
    const nodo = buildNode({ schedule: buildSchedule('2026-08-13T00:00:00.000Z', 1440, true) });
    expect(remindersFor(nodo, AHORA)).toEqual([]);
  });

  it('descarta los avisos que ya pasaron', () => {
    const avisos = remindersFor(eventoDe(60), new Date('2026-08-12T14:50:00.000Z'));
    expect(avisos).toEqual([]);
  });

  it('mantiene el aviso ámbar cuando el evento ya empezó', () => {
    const avisos = remindersFor(eventoDe(60), new Date('2026-08-12T14:30:00.000Z'));
    expect(avisos.map((a) => a.kind)).toEqual(['ambar']);
  });

  it('no programa más allá de la ventana de treinta días', () => {
    const lejano = eventoDe(60, '2026-10-30T14:00:00.000Z');
    expect(remindersFor(lejano, AHORA)).toEqual([]);

    const dentro = eventoDe(60, '2026-08-20T14:00:00.000Z');
    expect(remindersFor(dentro, AHORA)).toHaveLength(2);
    expect(REMINDER_WINDOW_DAYS).toBe(30);
  });

  it('usa un texto de respaldo cuando el evento no tiene nombre', () => {
    const nodo = buildNode({ text: '', schedule: buildSchedule('2026-08-12T14:00:00.000Z', 60) });
    expect(remindersFor(nodo, AHORA)[0].titulo).toBe('Empieza ahora');
  });
});

describe('allReminders', () => {
  it('junta los avisos de todos los eventos', () => {
    const nodos = [eventoDe(60), eventoDe(30, '2026-08-13T09:00:00.000Z'), buildNode({})];
    expect(allReminders(nodos, AHORA)).toHaveLength(4);
  });
});
