import { db } from './db';

export type ThemePreference = 'light' | 'dark' | 'system';

export const CLAVE_TEMA = 'tema';

export const settingsRepo = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const registro = await db.settings.get(key);
    return registro === undefined ? fallback : (registro.value as T);
  },

  async set(key: string, value: unknown): Promise<void> {
    await db.settings.put({ key, value });
  },
};

export function applyTheme(preference: ThemePreference): void {
  const oscuroDelSistema =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const oscuro = preference === 'dark' || (preference === 'system' && oscuroDelSistema);
  document.documentElement.classList.toggle('dark', oscuro);
}
