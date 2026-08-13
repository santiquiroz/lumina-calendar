import { describe, expect, it } from 'vitest';
import { parseIcs } from './ics';

function ics(...lineas: string[]): string {
  return lineas.join('\r\n');
}

function icsConLf(...lineas: string[]): string {
  return lineas.join('\n');
}

function partesLocales(iso: string) {
  const fecha = new Date(iso);
  return {
    anio: fecha.getFullYear(),
    mes: fecha.getMonth() + 1,
    dia: fecha.getDate(),
    hora: fecha.getHours(),
    minuto: fecha.getMinutes(),
  };
}

const CALENDARIO_GOOGLE = ics(
  'BEGIN:VCALENDAR',
  'PRODID:-//Google Inc//Google Calendar 70.9054//EN',
  'VERSION:2.0',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:Santiago',
  'X-WR-TIMEZONE:America/Bogota',
  'BEGIN:VTIMEZONE',
  'TZID:America/Bogota',
  'X-LIC-LOCATION:America/Bogota',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0500',
  'TZNAME:-05',
  'DTSTART:19700101T000000',
  'END:STANDARD',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'DTSTART;TZID=America/Bogota:20260812T090000',
  'DTEND;TZID=America/Bogota:20260812T100000',
  'DTSTAMP:20260810T120000Z',
  'UID:1a2b3c@google.com',
  'CREATED:20260801T101500Z',
  'DESCRIPTION:Revisión semanal\\nTemas: roadmap\\, presupuesto',
  'LAST-MODIFIED:20260805T090000Z',
  'LOCATION:Sala 3',
  'SEQUENCE:0',
  'STATUS:CONFIRMED',
  'SUMMARY:Reunión de equipo',
  'TRANSP:OPAQUE',
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  'DESCRIPTION:This is an event reminder',
  'SUMMARY:Recordatorio',
  'TRIGGER:-PT10M',
  'DURATION:PT15M',
  'REPEAT:2',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20260814',
  'DTEND;VALUE=DATE:20260815',
  'DTSTAMP:20260810T120000Z',
  'UID:4d5e6f@google.com',
  'SUMMARY:Día festivo',
  'STATUS:CONFIRMED',
  'TRANSP:TRANSPARENT',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=America/Bogota:20260816T140000',
  'DURATION:PT1H30M',
  'DTSTAMP:20260810T120000Z',
  'UID:7g8h9i@google.com',
  'SUMMARY:Sesión larga con un título muy largo que Google Calendar pliega en va',
  ' rias líneas',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'RECURRENCE-ID;TZID=America/Bogota:20260818T090000',
  'DTSTART;TZID=America/Bogota:20260818T110000',
  'DTEND;TZID=America/Bogota:20260818T120000',
  'DTSTAMP:20260810T120000Z',
  'UID:1a2b3c@google.com',
  'SUMMARY:Reunión de equipo (movida)',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=America/Bogota:20260819T090000',
  'DTEND;TZID=America/Bogota:20260819T100000',
  'DTSTAMP:20260810T120000Z',
  'UID:0j1k2l@google.com',
  'SUMMARY:Reunión cancelada',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
);

describe('parseIcs — bloques VEVENT', () => {
  it('ignora VTODO, VTIMEZONE y las propiedades sueltas de VCALENDAR', () => {
    const texto = ics(
      'BEGIN:VCALENDAR',
      'PRODID:-//Prueba//ES',
      'X-WR-CALNAME:Personal',
      'BEGIN:VTODO',
      'UID:tarea-1',
      'DTSTART:20260812T140000Z',
      'SUMMARY:Tarea pendiente',
      'END:VTODO',
      'BEGIN:VTIMEZONE',
      'TZID:America/Bogota',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETTO:-0500',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:evento-1',
      'DTSTART:20260812T140000Z',
      'SUMMARY:Único evento',
      'END:VEVENT',
      'END:VCALENDAR',
    );

    const eventos = parseIcs(texto);

    expect(eventos).toHaveLength(1);
    expect(eventos[0].uid).toBe('evento-1');
    expect(eventos[0].summary).toBe('Único evento');
  });

  it('no toma las propiedades de un VALARM anidado como propias del evento', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:con-alarma',
      'DTSTART:20260812T140000Z',
      'SUMMARY:Título real',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'SUMMARY:Recordatorio',
      'DURATION:PT15M',
      'TRIGGER:-PT10M',
      'END:VALARM',
      'END:VEVENT',
    );

    const [evento] = parseIcs(texto);

    expect(evento.summary).toBe('Título real');
    expect(evento.end).toBe('2026-08-12T15:00:00.000Z');
  });

  it('lee varios VEVENT seguidos en orden', () => {
    const texto = ics(
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:uno',
      'DTSTART:20260812T140000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:dos',
      'DTSTART:20260812T160000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    );

    expect(parseIcs(texto).map((evento) => evento.uid)).toEqual(['uno', 'dos']);
  });
});

describe('parseIcs — desdoblado de líneas', () => {
  it('une las líneas plegadas con espacio usando terminadores CRLF', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:plegado-crlf',
      'DTSTART:20260812T140000Z',
      'SUMMARY:Primera parte del título que sigue en la línea si',
      ' guiente',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].summary).toBe(
      'Primera parte del título que sigue en la línea siguiente',
    );
  });

  it('une las líneas plegadas con tabulación usando terminadores LF', () => {
    const texto = icsConLf(
      'BEGIN:VEVENT',
      'UID:plegado-lf',
      'DTSTART:20260812T140000Z',
      'SUMMARY:Título partido a la mi',
      '\ttad',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].summary).toBe('Título partido a la mitad');
  });

  it('desdobla también las propiedades de fecha', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:fecha-plegada',
      'DTSTART:202608',
      ' 12T140000Z',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].start).toBe('2026-08-12T14:00:00.000Z');
  });
});

describe('parseIcs — propiedades con parámetros', () => {
  it('respeta el TZID al convertir a UTC', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:con-tzid',
      'DTSTART;TZID=America/Bogota:20260812T140000',
      'DTEND;TZID=America/Bogota:20260812T150000',
      'END:VEVENT',
    );

    const [evento] = parseIcs(texto);

    expect(evento.start).toBe('2026-08-12T19:00:00.000Z');
    expect(evento.end).toBe('2026-08-12T20:00:00.000Z');
    expect(evento.allDay).toBe(false);
  });

  it('acepta el TZID entre comillas', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:tzid-comillas',
      'DTSTART;TZID="America/Bogota":20260812T140000',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].start).toBe('2026-08-12T19:00:00.000Z');
  });

  it('cae a la hora local del dispositivo si el TZID no existe', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:tzid-invalido',
      'DTSTART;TZID=Planeta/Marte:20260812T140000',
      'END:VEVENT',
    );

    expect(partesLocales(parseIcs(texto)[0].start)).toEqual({
      anio: 2026,
      mes: 8,
      dia: 12,
      hora: 14,
      minuto: 0,
    });
  });

  it('trata VALUE=DATE como evento de día completo', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:valor-fecha',
      'DTSTART;VALUE=DATE:20260812',
      'DTEND;VALUE=DATE:20260813',
      'END:VEVENT',
    );

    const [evento] = parseIcs(texto);

    expect(evento.allDay).toBe(true);
    expect(partesLocales(evento.start)).toMatchObject({ dia: 12, hora: 0, minuto: 0 });
    expect(partesLocales(evento.end)).toMatchObject({ dia: 13, hora: 0 });
  });
});

describe('parseIcs — formatos de fecha', () => {
  it('interpreta el sufijo Z como hora UTC', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:utc',
      'DTSTART:20260812T140000Z',
      'DTEND:20260812T153000Z',
      'END:VEVENT',
    );

    const [evento] = parseIcs(texto);

    expect(evento.start).toBe('2026-08-12T14:00:00.000Z');
    expect(evento.end).toBe('2026-08-12T15:30:00.000Z');
  });

  it('interpreta la fecha sin sufijo como hora local del dispositivo', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:flotante',
      'DTSTART:20260812T140000',
      'DTEND:20260812T161500',
      'END:VEVENT',
    );

    const [evento] = parseIcs(texto);

    expect(partesLocales(evento.start)).toEqual({
      anio: 2026,
      mes: 8,
      dia: 12,
      hora: 14,
      minuto: 0,
    });
    expect(partesLocales(evento.end)).toMatchObject({ hora: 16, minuto: 15 });
    expect(evento.allDay).toBe(false);
  });

  it('interpreta una fecha sin hora como día completo que termina al día siguiente', () => {
    const texto = ics('BEGIN:VEVENT', 'UID:solo-fecha', 'DTSTART:20260812', 'END:VEVENT');

    const [evento] = parseIcs(texto);

    expect(evento.allDay).toBe(true);
    expect(partesLocales(evento.start)).toMatchObject({ anio: 2026, mes: 8, dia: 12, hora: 0 });
    expect(partesLocales(evento.end)).toMatchObject({ anio: 2026, mes: 8, dia: 13, hora: 0 });
  });

  it('devuelve marcas de tiempo ISO 8601 absolutas', () => {
    const texto = ics('BEGIN:VEVENT', 'UID:iso', 'DTSTART:20260812T140000Z', 'END:VEVENT');

    expect(parseIcs(texto)[0].start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('parseIcs — duración', () => {
  it('calcula el fin con DURATION en horas y minutos', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:duracion-horas',
      'DTSTART:20260812T140000Z',
      'DURATION:PT1H30M',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].end).toBe('2026-08-12T15:30:00.000Z');
  });

  it('calcula el fin con DURATION en días', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:duracion-dias',
      'DTSTART:20260812T140000Z',
      'DURATION:P1D',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].end).toBe('2026-08-13T14:00:00.000Z');
  });

  it('prefiere DTEND sobre DURATION cuando están los dos', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:ambos',
      'DTSTART:20260812T140000Z',
      'DTEND:20260812T150000Z',
      'DURATION:PT5H',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].end).toBe('2026-08-12T15:00:00.000Z');
  });

  it('da una hora de duración cuando no hay DTEND ni DURATION', () => {
    const texto = ics('BEGIN:VEVENT', 'UID:sin-fin', 'DTSTART:20260812T140000Z', 'END:VEVENT');

    expect(parseIcs(texto)[0].end).toBe('2026-08-12T15:00:00.000Z');
  });

  it('ignora una DURATION ilegible y usa la hora por defecto', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:duracion-basura',
      'DTSTART:20260812T140000Z',
      'DURATION:un rato',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].end).toBe('2026-08-12T15:00:00.000Z');
  });
});

describe('parseIcs — texto escapado', () => {
  it('desescapa saltos de línea, comas, punto y coma y barras', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:escapes',
      'DTSTART:20260812T140000Z',
      'SUMMARY:Reunión\\, sala 3\\; piso 2\\nSegunda línea\\\\fin',
      'END:VEVENT',
    );

    expect(parseIcs(texto)[0].summary).toBe('Reunión, sala 3; piso 2\nSegunda línea\\fin');
  });

  it('no convierte una barra escapada seguida de n en un salto de línea', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:barra-literal',
      'DTSTART:20260812T140000Z',
      'SUMMARY:ruta C:\\\\nueva',
      'END:VEVENT',
    );

    const resumen = parseIcs(texto)[0].summary;

    expect(resumen).toBe('ruta C:\\nueva');
    expect(resumen).not.toContain('\n');
  });

  it('deja el resumen vacío cuando no hay SUMMARY', () => {
    const texto = ics('BEGIN:VEVENT', 'UID:sin-resumen', 'DTSTART:20260812T140000Z', 'END:VEVENT');

    expect(parseIcs(texto)[0].summary).toBe('');
  });
});

describe('parseIcs — eventos descartados', () => {
  it('descarta en silencio el VEVENT sin UID y conserva el resto', () => {
    const texto = ics(
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART:20260812T140000Z',
      'SUMMARY:Sin identificador',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:sobreviviente',
      'DTSTART:20260812T160000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    );

    expect(parseIcs(texto).map((evento) => evento.uid)).toEqual(['sobreviviente']);
  });

  it('descarta en silencio el VEVENT sin DTSTART y conserva el resto', () => {
    const texto = ics(
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:sin-inicio',
      'SUMMARY:No tiene fecha',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:sobreviviente',
      'DTSTART:20260812T160000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    );

    expect(parseIcs(texto).map((evento) => evento.uid)).toEqual(['sobreviviente']);
  });

  it('descarta el VEVENT con una fecha ilegible', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:fecha-rota',
      'DTSTART:mañana a las tres',
      'END:VEVENT',
    );

    expect(parseIcs(texto)).toEqual([]);
  });

  it('descarta el evento con RECURRENCE-ID', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:serie-1',
      'RECURRENCE-ID:20260812T140000Z',
      'DTSTART:20260812T160000Z',
      'SUMMARY:Instancia movida',
      'END:VEVENT',
    );

    expect(parseIcs(texto)).toEqual([]);
  });

  it('descarta el evento con STATUS:CANCELLED', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:cancelado',
      'DTSTART:20260812T140000Z',
      'STATUS:CANCELLED',
      'END:VEVENT',
    );

    expect(parseIcs(texto)).toEqual([]);
  });

  it('conserva el evento con STATUS:CONFIRMED', () => {
    const texto = ics(
      'BEGIN:VEVENT',
      'UID:confirmado',
      'DTSTART:20260812T140000Z',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    );

    expect(parseIcs(texto)).toHaveLength(1);
  });
});

describe('parseIcs — entradas inválidas', () => {
  it('devuelve un arreglo vacío con texto vacío', () => {
    expect(parseIcs('')).toEqual([]);
  });

  it('devuelve un arreglo vacío con texto que no es iCalendar', () => {
    expect(parseIcs('hola mundo\nesto no es un calendario: para nada\n\n')).toEqual([]);
  });

  it('no lanza con un VEVENT truncado', () => {
    expect(() => parseIcs('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:truncado')).not.toThrow();
    expect(parseIcs('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:truncado')).toEqual([]);
  });

  it('no lanza con una línea plegada al comienzo del archivo', () => {
    expect(() => parseIcs(' sin propiedad previa\r\nBEGIN:VCALENDAR\r\nEND:VCALENDAR')).not.toThrow();
  });
});

describe('parseIcs — archivo real de Google Calendar', () => {
  it('extrae solo los tres eventos vigentes', () => {
    expect(parseIcs(CALENDARIO_GOOGLE).map((evento) => evento.uid)).toEqual([
      '1a2b3c@google.com',
      '4d5e6f@google.com',
      '7g8h9i@google.com',
    ]);
  });

  it('convierte las horas de America/Bogota a UTC', () => {
    const [reunion] = parseIcs(CALENDARIO_GOOGLE);

    expect(reunion).toMatchObject({
      summary: 'Reunión de equipo',
      start: '2026-08-12T14:00:00.000Z',
      end: '2026-08-12T15:00:00.000Z',
      allDay: false,
    });
  });

  it('marca el festivo como día completo hasta el día siguiente', () => {
    const festivo = parseIcs(CALENDARIO_GOOGLE)[1];

    expect(festivo.allDay).toBe(true);
    expect(partesLocales(festivo.start)).toMatchObject({ mes: 8, dia: 14, hora: 0 });
    expect(partesLocales(festivo.end)).toMatchObject({ mes: 8, dia: 15, hora: 0 });
  });

  it('desdobla el título largo y aplica la duración PT1H30M', () => {
    const sesion = parseIcs(CALENDARIO_GOOGLE)[2];

    expect(sesion.summary).toBe(
      'Sesión larga con un título muy largo que Google Calendar pliega en varias líneas',
    );
    expect(sesion.start).toBe('2026-08-16T19:00:00.000Z');
    expect(sesion.end).toBe('2026-08-16T20:30:00.000Z');
  });
});
