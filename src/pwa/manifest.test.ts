import { describe, expect, it } from 'vitest';
import { manifiesto } from './manifest';

describe('manifiesto de la PWA', () => {
  it('usa el color primario y la superficie de Lumina', () => {
    expect(manifiesto.theme_color).toBe('#4648d4');
    expect(manifiesto.background_color).toBe('#f8f9ff');
  });

  it('se instala como aplicación independiente en español', () => {
    expect(manifiesto.display).toBe('standalone');
    expect(manifiesto.lang).toBe('es');
    expect(manifiesto.start_url).toBe('/');
  });

  it('declara los iconos de 192, 512 y maskable', () => {
    const tamanos = manifiesto.icons.map(
      (icono) => `${icono.sizes}-${'purpose' in icono ? icono.purpose : 'any'}`,
    );
    expect(tamanos).toContain('192x192-any');
    expect(tamanos).toContain('512x512-any');
    expect(tamanos).toContain('512x512-maskable');
  });

  it('sirve todos los iconos desde el propio origen', () => {
    for (const icono of manifiesto.icons) {
      expect(icono.src.startsWith('/')).toBe(true);
    }
  });
});
