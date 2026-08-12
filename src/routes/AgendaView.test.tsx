import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { nodesRepo } from '@/data/nodesRepo';
import { limpiarBase, renderConRuta } from '@/test/render';
import { AgendaView } from './AgendaView';

function enHoras(delta: number): Date {
  return new Date(Date.now() + delta * 3_600_000);
}

async function crearEvento(texto: string, desdeHoras: number): Promise<void> {
  await nodesRepo.create({
    text: texto,
    schedule: {
      start: enHoras(desdeHoras).toISOString(),
      end: enHoras(desdeHoras + 1).toISOString(),
      allDay: false,
    },
  });
}

beforeEach(limpiarBase);

describe('AgendaView', () => {
  it('muestra un estado vacío tranquilo cuando no hay nada por delante', async () => {
    renderConRuta(<AgendaView />);
    expect(await screen.findByText(/la agenda está despejada/i)).toBeInTheDocument();
  });

  it('agrupa los eventos por día y marca hoy', async () => {
    await crearEvento('Reunión de hoy', 2);
    renderConRuta(<AgendaView />);

    expect(await screen.findByText('Reunión de hoy')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument();
  });

  it('muestra el avance de subtareas de cada bloque', async () => {
    const evento = await nodesRepo.create({
      text: 'Bloque con tareas',
      schedule: {
        start: enHoras(2).toISOString(),
        end: enHoras(3).toISOString(),
        allDay: false,
      },
    });
    const subtarea = await nodesRepo.create({ text: 'Subtarea', parentId: evento.id });
    await nodesRepo.toggleDone(subtarea.id);

    renderConRuta(<AgendaView />);

    expect(await screen.findByText('1/1')).toBeInTheDocument();
  });

  it('no lista los días que ya pasaron', async () => {
    await crearEvento('Ayer', -30);
    renderConRuta(<AgendaView />);

    expect(await screen.findByText(/la agenda está despejada/i)).toBeInTheDocument();
  });
});
