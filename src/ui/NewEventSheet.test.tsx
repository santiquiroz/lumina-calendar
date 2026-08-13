import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/data/db';
import { useUiStore } from '@/store/uiStore';
import { limpiarBase, renderConRuta } from '@/test/render';
import { NewEventSheet } from './NewEventSheet';

beforeEach(async () => {
  await limpiarBase();
  useUiStore.setState({ eventoNuevoAbierto: true });
});

describe('NewEventSheet', () => {
  it('crea un evento con horario en un solo paso', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<NewEventSheet />);

    await usuario.type(screen.getByLabelText('¿Qué vas a hacer?'), 'Reunión de equipo');
    await usuario.clear(screen.getByLabelText('Empieza'));
    await usuario.type(screen.getByLabelText('Empieza'), '09:00');
    await usuario.clear(screen.getByLabelText('Termina'));
    await usuario.type(screen.getByLabelText('Termina'), '10:30');
    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    await waitFor(async () => expect(await db.nodes.count()).toBe(1));
    const evento = (await db.nodes.toArray())[0];
    expect(evento.text).toBe('Reunión de equipo');
    expect(evento.schedule).not.toBeNull();
    expect(useUiStore.getState().eventoNuevoAbierto).toBe(false);
  });

  it('pide un nombre antes de crear', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<NewEventSheet />);

    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/poné un nombre/i);
    expect(await db.nodes.count()).toBe(0);
  });

  it('rechaza un rango invertido sin vocabulario de culpa', async () => {
    const usuario = userEvent.setup();
    renderConRuta(<NewEventSheet />);

    await usuario.type(screen.getByLabelText('¿Qué vas a hacer?'), 'Algo');
    await usuario.clear(screen.getByLabelText('Empieza'));
    await usuario.type(screen.getByLabelText('Empieza'), '15:00');
    await usuario.clear(screen.getByLabelText('Termina'));
    await usuario.type(screen.getByLabelText('Termina'), '14:00');
    await usuario.click(screen.getByRole('button', { name: 'Crear evento' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/posterior a la de inicio/i);
    expect(alerta.textContent ?? '').not.toMatch(/fallast|inválido|error/i);
    expect(await db.nodes.count()).toBe(0);
  });

  it('no se muestra si no está abierta', async () => {
    useUiStore.setState({ eventoNuevoAbierto: false });
    renderConRuta(<NewEventSheet />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
