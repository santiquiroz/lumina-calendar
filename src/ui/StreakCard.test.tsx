import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StreakCard } from './StreakCard';

describe('StreakCard', () => {
  it('sin racha invita en vez de castigar', () => {
    render(<StreakCard racha={{ current: 0, longest: 0, forgivenessUsed: false }} />);

    expect(screen.getByText(/tu próxima racha empieza cuando quieras/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 días/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/perdist|fallast|rompiste/i)).not.toBeInTheDocument();
  });

  it('muestra la racha actual en singular y plural', () => {
    const { rerender } = render(
      <StreakCard racha={{ current: 1, longest: 1, forgivenessUsed: false }} />,
    );
    expect(screen.getByText('1 día claro')).toBeInTheDocument();

    rerender(<StreakCard racha={{ current: 4, longest: 4, forgivenessUsed: false }} />);
    expect(screen.getByText('4 días claros')).toBeInTheDocument();
  });

  it('explica el día de perdón con lenguaje amable', () => {
    render(<StreakCard racha={{ current: 5, longest: 9, forgivenessUsed: true }} />);

    expect(screen.getByText(/te tomaste un día libre\. la racha sigue\./i)).toBeInTheDocument();
    expect(screen.queryByText(/fallast/i)).not.toBeInTheDocument();
  });

  it('muestra el récord solo cuando supera la racha actual', () => {
    const { rerender } = render(
      <StreakCard racha={{ current: 3, longest: 12, forgivenessUsed: false }} />,
    );
    expect(screen.getByText(/tu récord: 12 días/i)).toBeInTheDocument();

    rerender(<StreakCard racha={{ current: 12, longest: 12, forgivenessUsed: false }} />);
    expect(screen.queryByText(/tu récord/i)).not.toBeInTheDocument();
  });
});
