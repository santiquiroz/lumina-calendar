import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { nodesRepo } from '@/data/nodesRepo';
import { useUiStore } from '@/store/uiStore';
import { limpiarBase, renderConRuta } from '@/test/render';
import { CanvasView } from './CanvasView';

beforeEach(limpiarBase);

describe('CanvasView', () => {
  it('invita a capturar cuando el canvas está vacío', async () => {
    renderConRuta(<CanvasView />);

    expect(await screen.findByText(/tu canvas está limpio/i)).toBeInTheDocument();
    expect(screen.queryByText(/fallast|vencid|atrasad/i)).not.toBeInTheDocument();
  });

  it('lista las ideas sin fecha y no los eventos', async () => {
    await nodesRepo.create({ text: 'Idea suelta' });
    await nodesRepo.create({
      text: 'Evento con hora',
      schedule: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3_600_000).toISOString(),
        allDay: false,
      },
    });

    renderConRuta(<CanvasView />);

    expect(await screen.findByText('Idea suelta')).toBeInTheDocument();
    expect(screen.queryByText('Evento con hora')).not.toBeInTheDocument();
  });

  it('abre la hoja de programación desde la idea', async () => {
    const usuario = userEvent.setup();
    const idea = await nodesRepo.create({ text: 'Programar esto' });

    renderConRuta(<CanvasView />);

    await usuario.click(await screen.findByRole('button', { name: 'Programar' }));
    expect(useUiStore.getState().nodoParaProgramar).toBe(idea.id);
  });

  it('descarta una idea con borrado suave', async () => {
    const usuario = userEvent.setup();
    const idea = await nodesRepo.create({ text: 'Ya no la quiero' });

    renderConRuta(<CanvasView />);

    await usuario.click(await screen.findByRole('button', { name: 'Descartar' }));

    await waitFor(async () => expect((await db.nodes.get(idea.id))?.deletedAt).not.toBeNull());
  });

  it('abre la captura desde el encabezado', async () => {
    const usuario = userEvent.setup();
    await nodesRepo.create({ text: 'Algo' });
    renderConRuta(<CanvasView />);

    await usuario.click(await screen.findByRole('button', { name: 'Capturar' }));
    expect(useUiStore.getState().capturaAbierta).toBe(true);
  });
});
