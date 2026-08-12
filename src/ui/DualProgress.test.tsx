import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildSchedule } from '@/test/factories';
import { DualProgress } from './DualProgress';

const INICIO = '2026-08-12T14:00:00.000Z';

describe('DualProgress', () => {
  it('muestra las dos barras cuando hay tareas y horario', () => {
    render(
      <DualProgress
        progreso={{ done: 1, total: 2, ratio: 0.5 }}
        schedule={buildSchedule(INICIO, 60)}
        now={new Date('2026-08-12T14:10:00.000Z')}
      />,
    );

    expect(screen.getByRole('progressbar', { name: 'Progreso de tareas' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiempo restante' })).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('omite la barra de tareas cuando la carpeta está vacía', () => {
    render(
      <DualProgress
        progreso={{ done: 0, total: 0, ratio: 0 }}
        schedule={buildSchedule(INICIO, 60)}
        now={new Date('2026-08-12T14:10:00.000Z')}
      />,
    );

    expect(screen.queryByRole('progressbar', { name: 'Progreso de tareas' })).not.toBeInTheDocument();
  });

  it('omite la barra de tiempo cuando el nodo no tiene horario', () => {
    render(
      <DualProgress
        progreso={{ done: 1, total: 2, ratio: 0.5 }}
        schedule={null}
        now={new Date()}
      />,
    );

    expect(screen.queryByRole('progressbar', { name: 'Tiempo restante' })).not.toBeInTheDocument();
  });

  it('cambia a tono ámbar cerca del final del bloque', () => {
    render(
      <DualProgress
        progreso={{ done: 1, total: 2, ratio: 0.5 }}
        schedule={buildSchedule(INICIO, 60)}
        now={new Date('2026-08-12T14:55:00.000Z')}
      />,
    );

    expect(screen.getByText('Tiempo restante').closest('[data-time-state]')).toHaveAttribute(
      'data-time-state',
      'amber',
    );
  });
});
