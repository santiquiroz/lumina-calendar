import { screen, waitFor, within } from '@testing-library/react';
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

  it('muestra los eventos de todo el día en su propia franja, fuera de la grilla', async () => {
    const inicio = hoyALas(0);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);
    const festivo = await nodesRepo.create({
      text: 'Día festivo',
      schedule: { start: inicio.toISOString(), end: fin.toISOString(), allDay: true },
    });
    await nodesRepo.create({
      text: 'Reunión de equipo',
      schedule: {
        start: hoyALas(10).toISOString(),
        end: hoyALas(11).toISOString(),
        allDay: false,
      },
    });

    renderConRuta(<DayView />);

    const franja = await screen.findByRole('region', { name: 'Todo el día' });
    expect(within(franja).getByRole('link', { name: /Día festivo/ })).toHaveAttribute(
      'href',
      `/nodo/${festivo.id}`,
    );
    expect(within(franja).queryByText('Reunión de equipo')).not.toBeInTheDocument();
    expect(await screen.findByText('Reunión de equipo')).toBeInTheDocument();
  });

  it('no muestra la franja de todo el día cuando no hay eventos así', async () => {
    await nodesRepo.create({
      text: 'Reunión de equipo',
      schedule: {
        start: hoyALas(10).toISOString(),
        end: hoyALas(11).toISOString(),
        allDay: false,
      },
    });

    renderConRuta(<DayView />);

    await screen.findByText('Reunión de equipo');
    expect(screen.queryByRole('region', { name: 'Todo el día' })).not.toBeInTheDocument();
  });

  it('pone en columnas distintas dos bloques que se solapan', async () => {
    for (const [texto, desde] of [
      ['Primero', hoyALas(10)],
      ['Segundo', hoyALas(10, 30)],
    ] as const) {
      await nodesRepo.create({
        text: texto,
        schedule: {
          start: desde.toISOString(),
          end: new Date(desde.getTime() + 3_600_000).toISOString(),
          allDay: false,
        },
      });
    }

    renderConRuta(<DayView />);

    const primero = (await screen.findByText('Primero')).closest('a') as HTMLElement;
    const segundo = (await screen.findByText('Segundo')).closest('a') as HTMLElement;
    expect(primero.style.left).not.toBe(segundo.style.left);
    expect(primero.style.width).toBe(segundo.style.width);
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
