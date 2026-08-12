import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { db } from '@/data/db';
import { toCalendarDay } from '@/domain/calendarDay';
import { useUiStore } from '@/store/uiStore';

export async function limpiarBase(): Promise<void> {
  await db.nodes.clear();
  await db.activities.clear();
  await db.settings.clear();
  useUiStore.setState({
    capturaAbierta: false,
    nodoParaProgramar: null,
    diaSeleccionado: toCalendarDay(new Date()),
  });
}

export function renderConRuta(elemento: ReactElement, ruta = '/'): RenderResult {
  return render(<MemoryRouter initialEntries={[ruta]}>{elemento}</MemoryRouter>);
}

export function renderEnRuta(
  patron: string,
  elemento: ReactElement,
  rutaInicial: string,
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <Routes>
        <Route path={patron} element={elemento} />
      </Routes>
    </MemoryRouter>,
  );
}
