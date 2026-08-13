import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UpdateInfo } from '@/data/updateRepo';
import { UpdateBanner } from './UpdateBanner';

const INFO: UpdateInfo = {
  version: '1.1.0',
  releaseUrl: 'https://github.com/santiquiroz/lumina-calendar/releases/tag/v1.1.0',
  apkUrl: 'https://github.com/santiquiroz/lumina-calendar/releases/download/v1.1.0/lumina.apk',
  notes: 'Notas',
};

describe('UpdateBanner', () => {
  it('anuncia la versión disponible', () => {
    render(<UpdateBanner info={INFO} onDismiss={() => {}} />);
    expect(screen.getByRole('complementary', { name: 'Actualización disponible' })).toBeVisible();
    expect(screen.getByText(/hay una versión nueva: 1\.1\.0/i)).toBeInTheDocument();
  });

  it('el botón de descarga apunta al APK', () => {
    render(<UpdateBanner info={INFO} onDismiss={() => {}} />);
    expect(screen.getByRole('link', { name: 'Descargar' })).toHaveAttribute('href', INFO.apkUrl);
  });

  it('sin APK cae a la página del release', () => {
    render(<UpdateBanner info={{ ...INFO, apkUrl: null }} onDismiss={() => {}} />);
    expect(screen.getByRole('link', { name: 'Descargar' })).toHaveAttribute(
      'href',
      INFO.releaseUrl,
    );
  });

  it('permite posponer sin lenguaje de presión', async () => {
    const usuario = userEvent.setup();
    const descartar = vi.fn();
    render(<UpdateBanner info={INFO} onDismiss={descartar} />);

    const banner = screen.getByRole('complementary');
    expect(banner.textContent ?? '').not.toMatch(/urgente|obligatorio|debés/i);

    await usuario.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(descartar).toHaveBeenCalled();
  });
});
