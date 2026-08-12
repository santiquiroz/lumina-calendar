import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { nodesRepo } from '@/data/nodesRepo';
import { useUiStore } from '@/store/uiStore';
import { limpiarBase, renderEnRuta } from '@/test/render';
import { NodeDetail } from './NodeDetail';

beforeEach(limpiarBase);

function enHoras(delta: number): string {
  return new Date(Date.now() + delta * 3_600_000).toISOString();
}

describe('NodeDetail', () => {
  it('avisa con calma cuando la carpeta ya no existe', async () => {
    renderEnRuta('/nodo/:id', <NodeDetail />, '/nodo/inexistente');
    expect(await screen.findByText(/ya no está disponible/i)).toBeInTheDocument();
  });

  it('muestra el título, el horario y el progreso dual', async () => {
    const evento = await nodesRepo.create({
      text: 'Revisión de diseño',
      schedule: { start: enHoras(1), end: enHoras(2), allDay: false },
    });
    await nodesRepo.create({ text: 'Primera subtarea', parentId: evento.id });

    renderEnRuta('/nodo/:id', <NodeDetail />, `/nodo/${evento.id}`);

    expect(await screen.findByRole('heading', { name: 'Revisión de diseño' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progreso de tareas' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiempo restante' })).toBeInTheDocument();
  });

  it('ofrece darle un lugar en el tiempo a una idea sin fecha', async () => {
    const usuario = userEvent.setup();
    const idea = await nodesRepo.create({ text: 'Idea suelta' });

    renderEnRuta('/nodo/:id', <NodeDetail />, `/nodo/${idea.id}`);

    await usuario.click(await screen.findByRole('button', { name: 'Darle un lugar' }));
    expect(useUiStore.getState().nodoParaProgramar).toBe(idea.id);
  });

  it('celebra cuando se completan todas las subtareas', async () => {
    const usuario = userEvent.setup();
    const evento = await nodesRepo.create({ text: 'Carpeta corta' });
    await nodesRepo.create({ text: 'Única subtarea', parentId: evento.id });

    renderEnRuta('/nodo/:id', <NodeDetail />, `/nodo/${evento.id}`);

    await usuario.click(await screen.findByLabelText('Completar Única subtarea'));

    expect(await screen.findByRole('dialog', { name: 'Carpeta completa' })).toBeInTheDocument();
  });

  it('ofrece el modo foco solo cuando hay subtareas', async () => {
    const evento = await nodesRepo.create({ text: 'Sin subtareas' });
    const { unmount } = renderEnRuta('/nodo/:id', <NodeDetail />, `/nodo/${evento.id}`);

    await screen.findByRole('heading', { name: 'Sin subtareas' });
    expect(screen.queryByRole('link', { name: /modo foco/i })).not.toBeInTheDocument();
    unmount();

    await nodesRepo.create({ text: 'Ahora sí', parentId: evento.id });
    renderEnRuta('/nodo/:id', <NodeDetail />, `/nodo/${evento.id}`);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /modo foco/i })).toBeInTheDocument(),
    );
  });
});
