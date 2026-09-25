import { dayBounds, toCalendarDay } from './calendarDay';
import type { Schedule } from './types';

const MS_POR_HORA = 3_600_000;

export interface GrillaDeArrastre {
  hourHeightPx: number;
  stepMinutes: number;
}

export function minutosPorDesplazamiento(deltaPx: number, grilla: GrillaDeArrastre): number {
  const pasos = Math.round((deltaPx / grilla.hourHeightPx) * (60 / grilla.stepMinutes));
  // Suma 0 para no devolver -0 cuando el redondeo cae a cero desde abajo.
  return pasos * grilla.stepMinutes + 0;
}

function sumarMinutosDeReloj(iso: string, minutos: number): number {
  const fecha = new Date(iso);
  fecha.setMinutes(fecha.getMinutes() + minutos);
  return fecha.getTime();
}

function acotar(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

function inicioMaximo(inicio: number, duracion: number, finDelDia: number): number {
  return Math.max(inicio, finDelDia - duracion);
}

export function desplazarHorario(schedule: Schedule, minutos: number): Schedule {
  const inicio = new Date(schedule.start).getTime();
  const duracion = new Date(schedule.end).getTime() - inicio;
  const { start: dia, end: finDelDia } = dayBounds(toCalendarDay(schedule.start));

  const nuevoInicio = acotar(
    sumarMinutosDeReloj(schedule.start, minutos),
    dia.getTime(),
    inicioMaximo(inicio, duracion, finDelDia.getTime()),
  );

  return {
    ...schedule,
    start: new Date(nuevoInicio).toISOString(),
    end: new Date(nuevoInicio + duracion).toISOString(),
  };
}

export function horarioArrastrado(
  schedule: Schedule,
  deltaPx: number,
  grilla: GrillaDeArrastre,
): Schedule {
  return desplazarHorario(schedule, minutosPorDesplazamiento(deltaPx, grilla));
}

export function cambiaElInicio(antes: Schedule, despues: Schedule): boolean {
  return new Date(antes.start).getTime() !== new Date(despues.start).getTime();
}

export function pixelesEntre(antes: Schedule, despues: Schedule, hourHeightPx: number): number {
  const ms = new Date(despues.start).getTime() - new Date(antes.start).getTime();
  return (ms / MS_POR_HORA) * hourHeightPx;
}
