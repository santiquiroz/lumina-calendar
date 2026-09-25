import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/data/db';
import { nodesRepo } from '@/data/nodesRepo';
import type { LuminaNode, Schedule } from '@/domain/types';
import { buildNode } from '@/test/factories';
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

function horarioDeHoy(desde: number, hasta: number, minutos = 0): Schedule {
  return {
    start: hoyALas(desde, minutos).toISOString(),
    end: hoyALas(hasta, minutos).toISOString(),
    allDay: false,
  };
}

function renderDiaConDetalle() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DayView />} />
        <Route path="/nodo/:id" element={<p>Detalle del nodo</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function arrastrar(bloque: HTMLElement, desdeY: number, hastaY: number): void {
  const puntero = { pointerId: 1, pointerType: 'mouse', button: 0 };
  fireEvent.pointerDown(bloque, { ...puntero, clientY: desdeY });
  fireEvent.pointerMove(bloque, { ...puntero, clientY: (desdeY + hastaY) / 2 });
  fireEvent.pointerMove(bloque, { ...puntero, clientY: hastaY });
  fireEvent.pointerUp(bloque, { ...puntero, clientY: hastaY });
  fireEvent.click(bloque);
}

async function crearReunion(): Promise<LuminaNode> {
  return nodesRepo.create({ text: 'Reunión de equipo', schedule: horarioDeHoy(10, 11) });
}

describe('DayView: reprogramar arrastrando', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mueve una hora el bloque arrastrado 64 px hacia abajo, sin abrir el detalle', async () => {
    const reunion = await crearReunion();
    const programar = vi.spyOn(nodesRepo, 'schedule');
    renderDiaConDetalle();

    arrastrar(await screen.findByRole('link', { name: /Reunión de equipo/ }), 100, 164);

    await waitFor(() =>
      expect(programar).toHaveBeenCalledWith(reunion.id, horarioDeHoy(11, 12)),
    );
    expect(programar).toHaveBeenCalledTimes(1);
    expect((await db.nodes.get(reunion.id))?.schedule).toEqual(horarioDeHoy(11, 12));
    expect(screen.queryByText('Detalle del nodo')).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(
      '«Reunión de equipo» ahora va de 11:00 a 12:00.',
    );
  });

  it('abre el detalle con un toque sin arrastre y no reprograma', async () => {
    await crearReunion();
    const programar = vi.spyOn(nodesRepo, 'schedule');
    renderDiaConDetalle();

    arrastrar(await screen.findByRole('link', { name: /Reunión de equipo/ }), 100, 100);

    expect(await screen.findByText('Detalle del nodo')).toBeInTheDocument();
    expect(programar).not.toHaveBeenCalled();
  });

  it('después de un arrastre, el siguiente toque vuelve a abrir el detalle', async () => {
    await crearReunion();
    renderDiaConDetalle();
    const bloque = await screen.findByRole('link', { name: /Reunión de equipo/ });

    fireEvent.pointerDown(bloque, { pointerId: 1, pointerType: 'touch', clientY: 100 });
    await new Promise((listo) => setTimeout(listo, 400));
    fireEvent.pointerMove(bloque, { pointerId: 1, pointerType: 'touch', clientY: 164 });
    fireEvent.pointerUp(bloque, { pointerId: 1, pointerType: 'touch', clientY: 164 });
    await screen.findByText(/ahora va de 11:00 a 12:00/);

    arrastrar(bloque, 100, 100);

    expect(await screen.findByText('Detalle del nodo')).toBeInTheDocument();
  });

  it('mueve quince minutos con las flechas del teclado y lo anuncia', async () => {
    const reunion = await crearReunion();
    renderConRuta(<DayView />);
    const bloque = await screen.findByRole('link', { name: /Reunión de equipo/ });
    expect(bloque).toHaveAccessibleDescription(/flechas arriba y abajo/i);

    fireEvent.keyDown(bloque, { key: 'ArrowDown' });

    await waitFor(async () =>
      expect((await db.nodes.get(reunion.id))?.schedule).toEqual(horarioDeHoy(10, 11, 15)),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('ahora va de 10:15 a 11:15');

    fireEvent.keyDown(bloque, { key: 'ArrowUp' });
    fireEvent.keyDown(bloque, { key: 'ArrowUp' });

    await waitFor(async () =>
      expect((await db.nodes.get(reunion.id))?.schedule).toEqual(horarioDeHoy(9, 10, 45)),
    );
  });

  it('avisa sin culpas si no pudo guardar el movimiento', async () => {
    await crearReunion();
    vi.spyOn(nodesRepo, 'shiftSchedule').mockRejectedValue(new Error('sin espacio'));
    renderConRuta(<DayView />);

    fireEvent.keyDown(await screen.findByRole('link', { name: /Reunión de equipo/ }), {
      key: 'ArrowDown',
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'No pudimos mover el bloque. Probá de nuevo.',
    );
  });

  it('deja quietos los eventos importados', async () => {
    const importado = buildNode({
      text: 'Clase importada',
      source: 'ics',
      externalId: 'archivo:clase',
      schedule: horarioDeHoy(10, 11),
    });
    await db.nodes.add(importado);
    const programar = vi.spyOn(nodesRepo, 'schedule');
    renderConRuta(<DayView />);
    const bloque = await screen.findByRole('link', { name: /Clase importada/ });

    arrastrar(bloque, 100, 164);
    fireEvent.keyDown(bloque, { key: 'ArrowDown' });

    expect(bloque).not.toHaveAccessibleDescription(/flechas/i);
    expect(programar).not.toHaveBeenCalled();
    expect((await db.nodes.get(importado.id))?.schedule).toEqual(horarioDeHoy(10, 11));
  });
});
