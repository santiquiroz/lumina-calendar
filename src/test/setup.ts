import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

if (!globalThis.crypto?.randomUUID) {
  let contador = 0;
  Object.defineProperty(globalThis.crypto ?? (globalThis.crypto = {} as Crypto), 'randomUUID', {
    value: () => `test-uuid-${(contador += 1)}`,
    configurable: true,
  });
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
