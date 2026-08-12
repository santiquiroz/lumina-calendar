import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('expone el progreso a lectores de pantalla', () => {
    render(<ProgressBar value={0.5} label="Progreso de tareas" />);
    expect(screen.getByRole('progressbar', { name: 'Progreso de tareas' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });

  it('recorta valores por encima de uno', () => {
    render(<ProgressBar value={1.7} label="Progreso" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('recorta valores negativos', () => {
    render(<ProgressBar value={-2} label="Progreso" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});
