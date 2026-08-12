import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { nodesRepo } from '@/data/nodesRepo';
import { limpiarBase, renderConRuta } from '@/test/render';
import { DayView } from './DayView';

function hoyALas(hora: number, minutos = 0): Date {
  const fecha = new Date();
  fecha.setHours(hora, minutos, 0, 0);
  return fecha;
}

beforeEach(limpiarBase);

describe('DayView', () => {
  it('muestra un estado vacío sin vocabulario de culpa', async () => {
    renderConRuta(<DayView />);

    expect(await screen.findByText(/nada agendado en este día/i)).toBeInTheDocument();
    expect(screen.queryByText(/fallaste|vencid|atrasad/i)).not.toBeInTheDocument();
  });

  it('lista los bloques del día seleccionado', async () => {
    await nodesRepo.create({
      text: 'Reunión de equipo',
      schedule: {
        start: hoyALas(10).toISOString(),
        end: hoyALas(11).toISOString(),
        allDay: false,
      },
    });

    renderConRuta(<DayView />);

    expect(await screen.findByText('Reunión de equipo')).toBeInTheDocument();
  });

  it('marca en ámbar el bloque que está por terminar', async () => {
    const ahora = new Date();
    await nodesRepo.create({
      text: 'Bloque en curso',
      schedule: {
        start: new Date(ahora.getTime() - 55 * 60_000).toISOString(),
        end: new Date(ahora.getTime() + 5 * 60_000).toISOString(),
        allDay: false,
      },
    });

    renderConRuta(<DayView />);

    const bloque = await screen.findByText('Bloque en curso');
    await waitFor(() =>
      expect(bloque.closest('[data-time-state]')).toHaveAttribute('data-time-state', 'amber'),
    );
  });

  it('no muestra el indicador de ahora en un día distinto de hoy', async () => {
    renderConRuta(<DayView />);
    await screen.findByRole('heading', { level: 1 });

    const anterior = screen.getByRole('button', { name: 'Día anterior' });
    anterior.click();

    await waitFor(() => expect(screen.queryByTestId('indicador-ahora')).not.toBeInTheDocument());
  });
});
