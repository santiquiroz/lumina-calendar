import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CelebrationSheet } from './CelebrationSheet';

const PROGRESO = { done: 3, total: 3, ratio: 1 };

describe('CelebrationSheet', () => {
  it('no aparece mientras esté cerrada', () => {
    render(
      <CelebrationSheet abierta={false} titulo="Diseño" progreso={PROGRESO} onClose={() => {}} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('celebra el cierre nombrando la carpeta', () => {
    render(
      <CelebrationSheet abierta titulo="Revisión de diseño" progreso={PROGRESO} onClose={() => {}} />,
    );

    expect(screen.getByRole('dialog', { name: 'Carpeta completa' })).toBeInTheDocument();
    expect(screen.getByText(/cerraste «revisión de diseño»/i)).toBeInTheDocument();
    expect(screen.getByText(/3 tareas completadas/i)).toBeInTheDocument();
  });

  it('se cierra con Escape', async () => {
    const usuario = userEvent.setup();
    const alCerrar = vi.fn();
    render(
      <CelebrationSheet abierta titulo="Diseño" progreso={PROGRESO} onClose={alCerrar} />,
    );

    await usuario.keyboard('{Escape}');
    expect(alCerrar).toHaveBeenCalled();
  });

  it('se cierra con el botón de listo', async () => {
    const usuario = userEvent.setup();
    const alCerrar = vi.fn();
    render(<CelebrationSheet abierta titulo="Diseño" progreso={PROGRESO} onClose={alCerrar} />);

    await usuario.click(screen.getByRole('button', { name: 'Listo' }));
    expect(alCerrar).toHaveBeenCalled();
  });
});
