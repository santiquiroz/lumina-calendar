import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexNodes } from '@/domain/tree';
import type { Schedule } from '@/domain/types';
import { buildNode } from '@/test/factories';
import { EventBlock } from './EventBlock';

function alas(hora: number, minutos = 0): string {
  return new Date(2026, 8, 15, hora, minutos).toISOString();
}

const HORARIO: Schedule = { start: alas(10), end: alas(11), allDay: false };
const POSICION = { top: 256, height: 64, left: 0, width: 1 };

function renderBloque(onMover = vi.fn()) {
  const nodo = buildNode({ text: 'Lectura', schedule: HORARIO });
  render(
    <MemoryRouter>
      <EventBlock
        node={nodo}
        position={POSICION}
        index={indexNodes([nodo])}
        now={new Date(2026, 8, 15, 8)}
        onMover={onMover}
      />
    </MemoryRouter>,
  );
  return { bloque: screen.getByRole('link', { name: /Lectura/ }), onMover };
}

function puntero(tipo: string, clientY: number) {
  return { pointerId: 7, pointerType: tipo, button: 0, clientY };
}

describe('EventBlock: arrastre', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra el horario previsto y se desplaza mientras se arrastra', () => {
    const { bloque } = renderBloque();

    fireEvent.pointerDown(bloque, puntero('mouse', 100));
    fireEvent.pointerMove(bloque, puntero('mouse', 180));

    expect(bloque).toHaveTextContent('11:15 - 12:15');
    expect(bloque.style.transform).toBe('translateY(80px)');
    expect(bloque).toHaveAttribute('data-arrastrando', 'true');
  });

  it('no reprograma si el desplazamiento no llega a medio paso', () => {
    const { bloque, onMover } = renderBloque();

    fireEvent.pointerDown(bloque, puntero('mouse', 100));
    fireEvent.pointerMove(bloque, puntero('mouse', 106));
    fireEvent.pointerUp(bloque, puntero('mouse', 106));

    expect(onMover).not.toHaveBeenCalled();
  });

  it('vuelve al lugar original si el gesto se cancela', () => {
    const { bloque, onMover } = renderBloque();

    fireEvent.pointerDown(bloque, puntero('mouse', 100));
    fireEvent.pointerMove(bloque, puntero('mouse', 164));
    fireEvent.pointerCancel(bloque, puntero('mouse', 164));

    expect(onMover).not.toHaveBeenCalled();
    expect(bloque).toHaveTextContent('10:00 - 11:00');
    expect(bloque.style.transform).toBe('');
  });

  it('ignora el botón secundario del mouse', () => {
    const { bloque, onMover } = renderBloque();

    fireEvent.pointerDown(bloque, { ...puntero('mouse', 100), button: 2 });
    fireEvent.pointerMove(bloque, puntero('mouse', 164));
    fireEvent.pointerUp(bloque, puntero('mouse', 164));

    expect(onMover).not.toHaveBeenCalled();
  });

  it('con el dedo, arrastra solo después de mantener presionado', () => {
    const { bloque, onMover } = renderBloque();

    fireEvent.pointerDown(bloque, puntero('touch', 100));
    act(() => vi.advanceTimersByTime(400));
    fireEvent.pointerMove(bloque, puntero('touch', 164));
    fireEvent.pointerUp(bloque, puntero('touch', 164));

    expect(onMover).toHaveBeenCalledWith(60);
  });

  it('con el dedo, deja desplazar la página si se mueve antes de tiempo', () => {
    const { bloque, onMover } = renderBloque();

    fireEvent.pointerDown(bloque, puntero('touch', 100));
    fireEvent.pointerMove(bloque, puntero('touch', 130));
    act(() => vi.advanceTimersByTime(400));
    fireEvent.pointerMove(bloque, puntero('touch', 164));
    fireEvent.pointerUp(bloque, puntero('touch', 164));

    expect(onMover).not.toHaveBeenCalled();
    expect(bloque).not.toHaveAttribute('data-arrastrando');
  });

  it('frena el desplazamiento de la página solo mientras arrastra con el dedo', () => {
    const { bloque } = renderBloque();
    const tocarYMover = () =>
      bloque.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true }));

    fireEvent.pointerDown(bloque, puntero('touch', 100));
    expect(tocarYMover()).toBe(true);

    act(() => vi.advanceTimersByTime(400));
    expect(tocarYMover()).toBe(false);
  });

  it('evita el menú contextual del toque largo mientras hay un gesto', () => {
    const { bloque } = renderBloque();
    expect(fireEvent.contextMenu(bloque)).toBe(true);

    fireEvent.pointerDown(bloque, puntero('touch', 100));
    act(() => vi.advanceTimersByTime(400));

    expect(fireEvent.contextMenu(bloque)).toBe(false);
  });

  it('ignora un segundo dedo mientras el primero sostiene el bloque', () => {
    const { bloque, onMover } = renderBloque();

    fireEvent.pointerDown(bloque, puntero('touch', 100));
    act(() => vi.advanceTimersByTime(200));
    fireEvent.pointerDown(bloque, { ...puntero('touch', 300), pointerId: 8 });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.pointerMove(bloque, puntero('touch', 164));
    fireEvent.pointerUp(bloque, puntero('touch', 164));

    expect(onMover).toHaveBeenCalledWith(60);
  });

  it('mueve de a quince minutos con las flechas y deja pasar las demás teclas', () => {
    const { bloque, onMover } = renderBloque();

    fireEvent.keyDown(bloque, { key: 'ArrowDown' });
    fireEvent.keyDown(bloque, { key: 'ArrowUp' });
    const enter = fireEvent.keyDown(bloque, { key: 'Enter' });

    expect(onMover.mock.calls).toEqual([[15], [-15]]);
    expect(enter).toBe(true);
  });

  it('no se arrastra ni ofrece las flechas sin quien lo mueva', () => {
    const nodo = buildNode({ text: 'Importado', schedule: HORARIO, source: 'ics' });
    render(
      <MemoryRouter>
        <EventBlock node={nodo} position={POSICION} index={indexNodes([nodo])} now={new Date()} />
      </MemoryRouter>,
    );
    const bloque = screen.getByRole('link', { name: /Importado/ });

    fireEvent.pointerDown(bloque, puntero('mouse', 100));
    fireEvent.pointerMove(bloque, puntero('mouse', 164));

    expect(bloque).not.toHaveAttribute('data-arrastrando');
    expect(bloque).not.toHaveAttribute('aria-describedby');
  });
});
