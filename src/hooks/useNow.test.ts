import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useNow', () => {
  it('avanza el instante actual en cada intervalo', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00.000Z'));
    const { result } = renderHook(() => useNow(1000));
    const inicial = result.current.getTime();

    act(() => {
      vi.setSystemTime(new Date('2026-08-12T10:00:05.000Z'));
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.getTime()).toBeGreaterThan(inicial);
  });

  it('limpia el intervalo al desmontar', () => {
    const limpiar = vi.spyOn(window, 'clearInterval');
    const { unmount } = renderHook(() => useNow(1000));
    unmount();
    expect(limpiar).toHaveBeenCalled();
  });
});
