import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { nodesRepo } from '@/data/nodesRepo';
import { useUiStore } from '@/store/uiStore';
import { limpiarBase, renderConRuta } from '@/test/render';
import { ScheduleSheet } from './ScheduleSheet';

beforeEach(limpiarBase);

async function abrirConIdea(texto = 'Estudiar ONNX'): Promise<string> {
  const idea = await nodesRepo.create({ text: texto });
  useUiStore.setState({ nodoParaProgramar: idea.id });
  return idea.id;
}

describe('ScheduleSheet', () => {
  it('programa la idea sin crear un nodo nuevo', async () => {
    const usuario = userEvent.setup();
    const ideaId = await abrirConIdea();
    renderConRuta(<ScheduleSheet />);

    await screen.findByRole('dialog');
    await usuario.clear(screen.getByLabelText('Empieza'));
    await usuario.type(screen.getByLabelText('Empieza'), '09:00');
    await usuario.clear(screen.getByLabelText('Termina'));
    await usuario.type(screen.getByLabelText('Termina'), '10:30');
    await usuario.click(screen.getByRole('button', { name: 'Programar' }));

    await waitFor(async () => {
      expect((await db.nodes.get(ideaId))?.schedule).not.toBeNull();
    });
    expect(await db.nodes.count()).toBe(1);
  });

  it('rechaza un rango invertido con un mensaje sin culpa', async () => {
    const usuario = userEvent.setup();
    await abrirConIdea();
    renderConRuta(<ScheduleSheet />);

    await screen.findByRole('dialog');
    await usuario.clear(screen.getByLabelText('Empieza'));
    await usuario.type(screen.getByLabelText('Empieza'), '15:00');
    await usuario.clear(screen.getByLabelText('Termina'));
    await usuario.type(screen.getByLabelText('Termina'), '14:00');
    await usuario.click(screen.getByRole('button', { name: 'Programar' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/posterior a la de inicio/i);
    expect(alerta.textContent ?? '').not.toMatch(/fallast|error grave|inválido/i);
  });

  it('muestra el texto de la idea que se está programando', async () => {
    await abrirConIdea('Escribir el README');
    renderConRuta(<ScheduleSheet />);

    expect(await screen.findByText('Escribir el README')).toBeInTheDocument();
  });
});
