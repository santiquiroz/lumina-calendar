import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { nodesRepo } from '@/data/nodesRepo';
import { limpiarBase, renderConRuta } from '@/test/render';
import { RewardsView } from './RewardsView';

beforeEach(limpiarBase);

describe('RewardsView', () => {
  it('explica qué cuenta como día de claridad', async () => {
    renderConRuta(<RewardsView />);
    expect(
      await screen.findByText(/un día cuenta cuando capturaste algo o cerraste una tarea/i),
    ).toBeInTheDocument();
  });

  it('lista todos los reconocimientos, logrados o no', async () => {
    renderConRuta(<RewardsView />);
    expect(await screen.findByText('Maestro del vaciado')).toBeInTheDocument();
    expect(screen.getByText('Treinta días claros')).toBeInTheDocument();
  });

  it('refleja la racha del día tras capturar una idea', async () => {
    await nodesRepo.create({ text: 'Idea de hoy' });
    renderConRuta(<RewardsView />);

    expect(await screen.findByText('1 día claro')).toBeInTheDocument();
  });
});
