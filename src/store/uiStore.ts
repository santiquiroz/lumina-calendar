import { create } from 'zustand';
import { toCalendarDay, type CalendarDay } from '@/domain/calendarDay';
import type { NodeId } from '@/domain/types';

interface UiState {
  capturaAbierta: boolean;
  eventoNuevoAbierto: boolean;
  diaSeleccionado: CalendarDay;
  nodoParaProgramar: NodeId | null;
  abrirCaptura(): void;
  cerrarCaptura(): void;
  abrirEventoNuevo(): void;
  cerrarEventoNuevo(): void;
  seleccionarDia(day: CalendarDay): void;
  abrirProgramacion(id: NodeId): void;
  cerrarProgramacion(): void;
}

export const useUiStore = create<UiState>((set) => ({
  capturaAbierta: false,
  eventoNuevoAbierto: false,
  diaSeleccionado: toCalendarDay(new Date()),
  nodoParaProgramar: null,
  abrirCaptura: () => set({ capturaAbierta: true }),
  cerrarCaptura: () => set({ capturaAbierta: false }),
  abrirEventoNuevo: () => set({ eventoNuevoAbierto: true }),
  cerrarEventoNuevo: () => set({ eventoNuevoAbierto: false }),
  seleccionarDia: (day) => set({ diaSeleccionado: day }),
  abrirProgramacion: (id) => set({ nodoParaProgramar: id }),
  cerrarProgramacion: () => set({ nodoParaProgramar: null }),
}));
