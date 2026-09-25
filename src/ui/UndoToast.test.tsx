import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '@/store/uiStore';
import { limpiarBase } from '@/test/render';
import { DURACION_AVISO_DESHACER_MS, UndoToast } from './UndoToast';

beforeEach(limpiarBase);

afterEach(() => {
  vi.useRealTimers();
});

describe('UndoToast', () => {
  it('deja lista la región de estado aunque no haya nada que deshacer', () => {
    render(<UndoToast />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('anuncia el descarte con un botón para deshacer y sin vocabulario de culpa', () => {
    render(<UndoToast />);

    act(() => useUiStore.getState().avisarDescarte('n1', 'Idea descartada'));

    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Idea descartada');
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
    expect(region.textContent ?? '').not.toMatch(/fallaste|vencid|atrasad|perdiste|urgente/i);
  });

  it('se retira solo después de unos segundos', () => {
    vi.useFakeTimers();
    render(<UndoToast />);

    act(() => useUiStore.getState().avisarDescarte('n1', 'Idea descartada'));
    act(() => vi.advanceTimersByTime(DURACION_AVISO_DESHACER_MS - 1));
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
    expect(useUiStore.getState().descarte).toBeNull();
  });

  it('no se retira mientras el botón tiene el foco', () => {
    vi.useFakeTimers();
    render(<UndoToast />);

    act(() => useUiStore.getState().avisarDescarte('n1', 'Idea descartada'));
    act(() => screen.getByRole('button', { name: 'Deshacer' }).focus());
    act(() => vi.advanceTimersByTime(DURACION_AVISO_DESHACER_MS * 2));

    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
  });

  it('un descarte nuevo reemplaza al anterior y reinicia la espera', () => {
    vi.useFakeTimers();
    render(<UndoToast />);

    act(() => useUiStore.getState().avisarDescarte('n1', 'Idea descartada'));
    act(() => vi.advanceTimersByTime(DURACION_AVISO_DESHACER_MS - 1000));
    act(() => useUiStore.getState().avisarDescarte('n2', 'Subtarea descartada'));
    act(() => vi.advanceTimersByTime(DURACION_AVISO_DESHACER_MS - 1000));

    expect(screen.getByRole('status')).toHaveTextContent('Subtarea descartada');
    expect(useUiStore.getState().descarte?.id).toBe('n2');
  });
});
