import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AttributionNotice } from './AttributionNotice';

describe('AttributionNotice', () => {
  it('nombra a los dos autores exigidos por la licencia', () => {
    render(<AttributionNotice />);
    expect(
      screen.getByText(/diego luis álvarez garcía y santiago quiroz upegui/i),
    ).toBeInTheDocument();
  });

  it('declara la licencia y la obligación de conservar el aviso', () => {
    render(<AttributionNotice />);
    expect(screen.getByText(/agpl-3\.0/i)).toBeInTheDocument();
    expect(screen.getByText(/conservarse visible/i)).toBeInTheDocument();
  });
});
