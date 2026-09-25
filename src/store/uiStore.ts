import { create } from 'zustand';
import { toCalendarDay, type CalendarDay } from '@/domain/calendarDay';
import type { NodeId } from '@/domain/types';

export interface DescarteReciente {
  id: NodeId;
  mensaje: string;
}

interface UiState {
  capturaAbierta: boolean;
  eventoNuevoAbierto: boolean;
  diaSeleccionado: CalendarDay;
  nodoParaProgramar: NodeId | null;
  descarte: DescarteReciente | null;
  abrirCaptura(): void;
  cerrarCaptura(): void;
  abrirEventoNuevo(): void;
  cerrarEventoNuevo(): void;
  seleccionarDia(day: CalendarDay): void;
  abrirProgramacion(id: NodeId): void;
  cerrarProgramacion(): void;
  avisarDescarte(id: NodeId, mensaje: string): void;
  cerrarDescarte(): void;
}

export const useUiStore = create<UiState>((set) => ({
  capturaAbierta: false,
  eventoNuevoAbierto: false,
  diaSeleccionado: toCalendarDay(new Date()),
  nodoParaProgramar: null,
  descarte: null,
  abrirCaptura: () => set({ capturaAbierta: true }),
  cerrarCaptura: () => set({ capturaAbierta: false }),
  abrirEventoNuevo: () => set({ eventoNuevoAbierto: true }),
  cerrarEventoNuevo: () => set({ eventoNuevoAbierto: false }),
  seleccionarDia: (day) => set({ diaSeleccionado: day }),
  abrirProgramacion: (id) => set({ nodoParaProgramar: id }),
  cerrarProgramacion: () => set({ nodoParaProgramar: null }),
  avisarDescarte: (id, mensaje) => set({ descarte: { id, mensaje } }),
  cerrarDescarte: () => set({ descarte: null }),
}));
