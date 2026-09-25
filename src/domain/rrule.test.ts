import { describe, expect, it } from 'vitest';
import {
  diaCivil,
  diaDeLaSemana,
  diasDeLaRegla,
  fechaCivil,
  parseRrule,
  type ReglaRecurrencia,
} from './rrule';

describe('parseRrule', () => {
  it('lee todas las partes que Lumina interpreta', () => {
    expect(
      parseRrule(
        'freq=monthly;interval=2;count=5;byday=2TU,-1FR;bymonthday=1,-1;bymonth=3,9;wkst=SU;',
      ),
    ).toEqual({
      frecuencia: 'MONTHLY',
      intervalo: 2,
      conteo: 5,
      hasta: null,
      porDia: [
        { dia: 2, ordinal: 2 },
        { dia: 5, ordinal: -1 },
      ],
      porDiaDelMes: [1, -1],
      porMes: [3, 9],
      inicioSemana: 0,
    });
  });

  it('usa intervalo 1, sin conteo y semana desde el lunes cuando no se indican', () => {
    expect(parseRrule('FREQ=DAILY;UNTIL=20260901T000000Z')).toMatchObject({
      intervalo: 1,
      conteo: null,
      hasta: '20260901T000000Z',
      inicioSemana: 1,
    });
  });

  it.each([
    ['sin FREQ', 'COUNT=3'],
    ['frecuencia por minutos', 'FREQ=MINUTELY'],
    ['parte desconocida', 'FREQ=DAILY;BYHOUR=9'],
    ['parte sin valor', 'FREQ=DAILY;COUNT'],
    ['INTERVAL en cero', 'FREQ=DAILY;INTERVAL=0'],
    ['COUNT ilegible', 'FREQ=DAILY;COUNT=muchas'],
    ['ordinal en una regla semanal', 'FREQ=WEEKLY;BYDAY=1MO'],
    ['ordinal en cero', 'FREQ=MONTHLY;BYDAY=0MO'],
    ['día de la semana inventado', 'FREQ=WEEKLY;BYDAY=XX'],
    ['día del mes en cero', 'FREQ=MONTHLY;BYMONTHDAY=0'],
    ['mes trece', 'FREQ=YEARLY;BYMONTH=13'],
    ['WKST inventado', 'FREQ=WEEKLY;WKST=XX'],
  ])('rechaza la regla con %s', (_caso, regla) => {
    expect(parseRrule(regla)).toBeNull();
  });
});

describe('fechas civiles', () => {
  it('ida y vuelta entre fecha y número de día', () => {
    expect(fechaCivil(diaCivil(2024, 2, 29))).toEqual([2024, 2, 29]);
    expect(diaCivil(1970, 1, 1)).toBe(0);
  });

  it('da el día de la semana también antes de 1970', () => {
    expect(diaDeLaSemana(0)).toBe(4);
    expect(diaDeLaSemana(-1)).toBe(3);
    expect(diaDeLaSemana(diaCivil(2026, 8, 3))).toBe(1);
  });
});

describe('diasDeLaRegla', () => {
  it('termina aunque la regla nunca coincida', () => {
    const regla = parseRrule('FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30') as ReglaRecurrencia;
    const inicio = diaCivil(2026, 1, 1);

    expect([...diasDeLaRegla(regla, inicio, inicio + 3_650)]).toEqual([]);
  });
});
