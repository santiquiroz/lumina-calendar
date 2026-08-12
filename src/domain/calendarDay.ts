const MS_POR_DIA = 86_400_000;

export type CalendarDay = string;

export function toCalendarDay(iso: string | Date): CalendarDay {
  const fecha = iso instanceof Date ? iso : new Date(iso);
  const anio = fecha.getFullYear();
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function parseCalendarDay(day: CalendarDay): Date {
  const [anio, mes, dia] = day.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function addDays(day: CalendarDay, delta: number): CalendarDay {
  const fecha = parseCalendarDay(day);
  fecha.setDate(fecha.getDate() + delta);
  return toCalendarDay(fecha);
}

export function daysBetween(desde: CalendarDay, hasta: CalendarDay): number {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / MS_POR_DIA);
}

export function dayBounds(day: CalendarDay): { start: Date; end: Date } {
  const start = parseCalendarDay(day);
  const end = parseCalendarDay(addDays(day, 1));
  return { start, end };
}

const FORMATO_LARGO = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const FORMATO_MES = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });

export function formatDayLong(day: CalendarDay): string {
  return FORMATO_LARGO.format(parseCalendarDay(day));
}

export function formatMonthLong(day: CalendarDay): string {
  return FORMATO_MES.format(parseCalendarDay(day));
}

export function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
