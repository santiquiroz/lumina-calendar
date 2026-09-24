import { dayBounds, parseCalendarDay, type CalendarDay } from './calendarDay';
import type { LuminaNode, Schedule } from './types';

const MS_POR_HORA = 3_600_000;

export interface DayGrid {
  startHour: number;
  endHour: number;
  hourHeightPx: number;
  minBlockPx: number;
}

export interface DayBlock {
  node: LuminaNode;
  top: number;
  height: number;
  left: number;
  width: number;
}

export interface DayLayout {
  allDay: LuminaNode[];
  blocks: DayBlock[];
}

interface Caja {
  node: LuminaNode;
  top: number;
  height: number;
}

interface Agrupacion {
  grupos: Caja[][];
  fin: number;
}

interface Rango {
  start: number;
  end: number;
}

export function layoutDay(nodes: LuminaNode[], day: CalendarDay, grid: DayGrid): DayLayout {
  const programados = nodes.filter((nodo) => nodo.schedule !== null);
  const esDeTodoElDia = (nodo: LuminaNode) => cubreElDia(nodo.schedule as Schedule, day);
  const rango = rangoDeGrilla(day, grid);

  const cajas = programados
    .filter((nodo) => !esDeTodoElDia(nodo))
    .map((nodo) => cajaEnGrilla(nodo, rango, grid));

  return {
    allDay: programados.filter(esDeTodoElDia),
    blocks: agruparSolapadas(ordenarCajas(cajas)).flatMap(repartirColumnas),
  };
}

function cubreElDia(schedule: Schedule, day: CalendarDay): boolean {
  if (schedule.allDay) return true;
  const { start, end } = dayBounds(day);
  return (
    new Date(schedule.start).getTime() <= start.getTime() &&
    new Date(schedule.end).getTime() >= end.getTime()
  );
}

function aLaHora(day: CalendarDay, hora: number): number {
  const base = parseCalendarDay(day);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hora).getTime();
}

function rangoDeGrilla(day: CalendarDay, grid: DayGrid): Rango {
  return { start: aLaHora(day, grid.startHour), end: aLaHora(day, grid.endHour) };
}

function acotar(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

function cajaEnGrilla(node: LuminaNode, rango: Rango, grid: DayGrid): Caja {
  const schedule = node.schedule as Schedule;
  const inicio = acotar(new Date(schedule.start).getTime(), rango.start, rango.end);
  const fin = acotar(new Date(schedule.end).getTime(), rango.start, rango.end);
  const altoGrilla = ((rango.end - rango.start) / MS_POR_HORA) * grid.hourHeightPx;

  const height = Math.max(grid.minBlockPx, ((fin - inicio) / MS_POR_HORA) * grid.hourHeightPx);
  const top = ((inicio - rango.start) / MS_POR_HORA) * grid.hourHeightPx;
  return { node, top: acotar(top, 0, altoGrilla - height), height };
}

function ordenarCajas(cajas: Caja[]): Caja[] {
  return [...cajas].sort((a, b) => a.top - b.top || b.height - a.height);
}

function finDe(caja: Caja): number {
  return caja.top + caja.height;
}

function sumarCaja({ grupos, fin }: Agrupacion, caja: Caja): Agrupacion {
  if (caja.top >= fin) return { grupos: [...grupos, [caja]], fin: finDe(caja) };
  const actual = grupos[grupos.length - 1];
  return { grupos: [...grupos.slice(0, -1), [...actual, caja]], fin: Math.max(fin, finDe(caja)) };
}

function agruparSolapadas(ordenadas: Caja[]): Caja[][] {
  return ordenadas.reduce(sumarCaja, { grupos: [], fin: Number.NEGATIVE_INFINITY }).grupos;
}

function columnaLibre(finesPorColumna: number[], caja: Caja): number {
  const libre = finesPorColumna.findIndex((fin) => fin <= caja.top);
  return libre === -1 ? finesPorColumna.length : libre;
}

function asignarColumnas(grupo: Caja[]): number[] {
  const finesPorColumna: number[] = [];
  return grupo.map((caja) => {
    const columna = columnaLibre(finesPorColumna, caja);
    finesPorColumna[columna] = finDe(caja);
    return columna;
  });
}

function repartirColumnas(grupo: Caja[]): DayBlock[] {
  const columnas = asignarColumnas(grupo);
  const width = 1 / (Math.max(...columnas) + 1);
  return grupo.map((caja, i) => ({ ...caja, left: columnas[i] * width, width }));
}
