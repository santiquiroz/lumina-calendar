import { create } from 'zustand';
import { toCalendarDay, type CalendarDay } from '@/domain/calendarDay';
import type { NodeId } from '@/domain/types';

interface UiState {
  capturaAbierta: boolean;
  diaSeleccionado: CalendarDay;
  nodoParaProgramar: NodeId | null;
  abrirCaptura(): void;
  cerrarCaptura(): void;
  seleccionarDia(day: CalendarDay): void;
  abrirProgramacion(id: NodeId): void;
  cerrarProgramacion(): void;
}

export const useUiStore = create<UiState>((set) => ({
  capturaAbierta: false,
  diaSeleccionado: toCalendarDay(new Date()),
  nodoParaProgramar: null,
  abrirCaptura: () => set({ capturaAbierta: true }),
  cerrarCaptura: () => set({ capturaAbierta: false }),
  seleccionarDia: (day) => set({ diaSeleccionado: day }),
  abrirProgramacion: (id) => set({ nodoParaProgramar: id }),
  cerrarProgramacion: () => set({ nodoParaProgramar: null }),
}));
