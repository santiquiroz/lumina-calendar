import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { nodesRepo } from '@/data/nodesRepo';
import { limpiarBase, renderConRuta } from '@/test/render';
import { AgendaView } from './AgendaView';

// Horas fijas del día en curso: "ahora + N horas" hacía que el evento cayera en
// el día siguiente cuando la suite corre de noche.
function hoyALas(hora: number, diaDelta = 0): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diaDelta);
  fecha.setHours(hora, 0, 0, 0);
  return fecha;
}

async function crearEvento(texto: string, hora: number, diaDelta = 0): Promise<void> {
  await nodesRepo.create({
    text: texto,
    schedule: {
      start: hoyALas(hora, diaDelta).toISOString(),
      end: hoyALas(hora + 1, diaDelta).toISOString(),
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
    await crearEvento('Reunión de hoy', 10);
    renderConRuta(<AgendaView />);

    expect(await screen.findByText('Reunión de hoy')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument();
  });

  it('muestra el avance de subtareas de cada bloque', async () => {
    const evento = await nodesRepo.create({
      text: 'Bloque con tareas',
      schedule: {
        start: hoyALas(14).toISOString(),
        end: hoyALas(15).toISOString(),
        allDay: false,
      },
    });
    const subtarea = await nodesRepo.create({ text: 'Subtarea', parentId: evento.id });
    await nodesRepo.toggleDone(subtarea.id);

    renderConRuta(<AgendaView />);

    expect(await screen.findByText('1/1')).toBeInTheDocument();
  });

  it('no lista los días que ya pasaron', async () => {
    await crearEvento('Ayer', 10, -1);
    renderConRuta(<AgendaView />);

    expect(await screen.findByText(/la agenda está despejada/i)).toBeInTheDocument();
  });
});
