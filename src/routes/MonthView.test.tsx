import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { nodesRepo } from '@/data/nodesRepo';
import { toCalendarDay } from '@/domain/calendarDay';
import { useUiStore } from '@/store/uiStore';
import { limpiarBase, renderConRuta } from '@/test/render';
import { MonthView } from './MonthView';

beforeEach(limpiarBase);

describe('MonthView', () => {
  it('dibuja seis semanas con encabezados de día', async () => {
    renderConRuta(<MonthView />);

    await screen.findByRole('grid', { name: 'Cuadrícula del mes' });
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('anuncia la cantidad de bloques de cada día', async () => {
    const hoy = new Date();
    hoy.setHours(10, 0, 0, 0);
    await nodesRepo.create({
      text: 'Reunión',
      schedule: {
        start: hoy.toISOString(),
        end: new Date(hoy.getTime() + 3_600_000).toISOString(),
        allDay: false,
      },
    });

    renderConRuta(<MonthView />);

    await waitFor(() =>
      expect(screen.getByRole('gridcell', { name: `${hoy.getDate()}, 1 bloque` })).toBeInTheDocument(),
    );
  });

  it('al tocar un día lo selecciona para la vista diaria', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<MonthView />);

    const celdas = await screen.findAllByRole('gridcell');
    await usuario.click(celdas[10]);

    expect(useUiStore.getState().diaSeleccionado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('navega entre meses', async () => {
    const usuario = userEvent.setup();
    useUiStore.setState({ diaSeleccionado: toCalendarDay(new Date(2026, 7, 12)) });
    renderConRuta(<MonthView />);

    expect(await screen.findByRole('heading', { name: /agosto de 2026/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(await screen.findByRole('heading', { name: /septiembre de 2026/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(await screen.findByRole('heading', { name: /agosto de 2026/i })).toBeInTheDocument();
  });
});
