import { addDays, toCalendarDay, type CalendarDay } from './calendarDay';

export const SEMANAS_EN_CUADRICULA = 6;
export const DIAS_POR_SEMANA = 7;

export const NOMBRES_DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function monthGrid(year: number, month: number): CalendarDay[][] {
  const primero = new Date(year, month, 1);
  const inicio = addDays(toCalendarDay(primero), -primero.getDay());

  return Array.from({ length: SEMANAS_EN_CUADRICULA }, (_, semana) =>
    Array.from({ length: DIAS_POR_SEMANA }, (_, dia) =>
      addDays(inicio, semana * DIAS_POR_SEMANA + dia),
    ),
  );
}

export function belongsToMonth(day: CalendarDay, year: number, month: number): boolean {
  const [anio, mes] = day.split('-').map(Number);
  return anio === year && mes === month + 1;
}
