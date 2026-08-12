import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { nodesRepo } from '@/data/nodesRepo';
import { limpiarBase, renderEnRuta } from '@/test/render';
import { FocusMode } from './FocusMode';

beforeEach(limpiarBase);

async function carpetaConTareas(cantidad: number): Promise<string> {
  const raiz = await nodesRepo.create({ text: 'Carpeta enfocada' });
  for (let i = 0; i < cantidad; i += 1) {
    await nodesRepo.create({ text: `Tarea ${i + 1}`, parentId: raiz.id });
  }
  return raiz.id;
}

describe('FocusMode', () => {
  it('muestra una sola subtarea a la vez', async () => {
    const rootId = await carpetaConTareas(3);
    renderEnRuta('/nodo/:id/foco', <FocusMode />, `/nodo/${rootId}/foco`);

    expect(await screen.findByText('Tarea 1')).toBeInTheDocument();
    expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
  });

  it('avanza a la siguiente al completar', async () => {
    const usuario = userEvent.setup();
    const rootId = await carpetaConTareas(2);
    renderEnRuta('/nodo/:id/foco', <FocusMode />, `/nodo/${rootId}/foco`);

    await screen.findByText('Tarea 1');
    await usuario.click(screen.getByRole('button', { name: /está hecha/i }));

    expect(await screen.findByText('Tarea 2')).toBeInTheDocument();
  });

  it('cuenta las tareas pendientes', async () => {
    const rootId = await carpetaConTareas(3);
    renderEnRuta('/nodo/:id/foco', <FocusMode />, `/nodo/${rootId}/foco`);

    expect(await screen.findByText('3 tareas pendientes')).toBeInTheDocument();
  });

  it('cierra con una celebración al terminar la última', async () => {
    const usuario = userEvent.setup();
    const rootId = await carpetaConTareas(1);
    renderEnRuta('/nodo/:id/foco', <FocusMode />, `/nodo/${rootId}/foco`);

    await screen.findByText('Tarea 1');
    await usuario.click(screen.getByRole('button', { name: /está hecha/i }));

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Carpeta completa' })).toBeInTheDocument(),
    );
  });

  it('avisa sin culpa cuando ya no queda nada pendiente', async () => {
    const rootId = await carpetaConTareas(1);
    const subtarea = (await nodesRepo.listSubtree(rootId))[0];
    await nodesRepo.toggleDone(subtarea.id);

    renderEnRuta('/nodo/:id/foco', <FocusMode />, `/nodo/${rootId}/foco`);

    expect(await screen.findByText(/no queda nada pendiente acá/i)).toBeInTheDocument();
  });

  it('avisa cuando la carpeta ya no existe', async () => {
    renderEnRuta('/nodo/:id/foco', <FocusMode />, '/nodo/fantasma/foco');
    expect(await screen.findByText(/ya no está disponible/i)).toBeInTheDocument();
  });
});
