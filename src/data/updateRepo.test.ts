import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';
import { settingsRepo } from './settingsRepo';
import {
  CLAVE_ULTIMO_CHEQUEO,
  CLAVE_VERSION_DESCARTADA,
  CHECK_THROTTLE_MS,
  checkForUpdate,
  dismissUpdate,
  fetchLatestRelease,
} from './updateRepo';

const AHORA = new Date('2026-09-01T10:00:00.000Z').getTime();

function respuestaGithub(cuerpo: unknown, ok = true): typeof fetch {
  return vi.fn(async () =>
    ({
      ok,
      json: async () => cuerpo,
    }) as unknown as Response,
  ) as unknown as typeof fetch;
}

const RELEASE = {
  tag_name: 'v1.2.0',
  html_url: 'https://github.com/santiquiroz/lumina-calendar/releases/tag/v1.2.0',
  body: 'Novedades de la versión.',
  assets: [
    { name: 'ruido.txt', browser_download_url: 'https://ejemplo/ruido.txt' },
    { name: 'lumina-calendar-1.2.0.apk', browser_download_url: 'https://ejemplo/lumina.apk' },
  ],
};

beforeEach(async () => {
  await db.settings.clear();
});

describe('fetchLatestRelease', () => {
  it('mapea la etiqueta, el APK y las notas', async () => {
    const info = await fetchLatestRelease(respuestaGithub(RELEASE));
    expect(info).toEqual({
      version: '1.2.0',
      releaseUrl: RELEASE.html_url,
      apkUrl: 'https://ejemplo/lumina.apk',
      notes: 'Novedades de la versión.',
    });
  });

  it('devuelve null si el release no trae APK pero conserva la URL', async () => {
    const info = await fetchLatestRelease(respuestaGithub({ ...RELEASE, assets: [] }));
    expect(info?.apkUrl).toBeNull();
    expect(info?.releaseUrl).toBe(RELEASE.html_url);
  });

  it('devuelve null ante una respuesta con error', async () => {
    expect(await fetchLatestRelease(respuestaGithub(RELEASE, false))).toBeNull();
  });

  it('devuelve null sin red en vez de propagar el fallo', async () => {
    const sinRed = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    expect(await fetchLatestRelease(sinRed)).toBeNull();
  });

  it('devuelve null si el release no tiene etiqueta', async () => {
    expect(await fetchLatestRelease(respuestaGithub({ html_url: 'x' }))).toBeNull();
  });
});

describe('checkForUpdate', () => {
  it('avisa cuando la publicación es más nueva que la instalada', async () => {
    const info = await checkForUpdate({
      current: '1.0.0',
      now: AHORA,
      fetchImpl: respuestaGithub(RELEASE),
    });
    expect(info?.version).toBe('1.2.0');
  });

  it('no avisa cuando ya está al día', async () => {
    const info = await checkForUpdate({
      current: '1.2.0',
      now: AHORA,
      fetchImpl: respuestaGithub(RELEASE),
    });
    expect(info).toBeNull();
  });

  it('no consulta otra vez antes de las doce horas', async () => {
    const consulta = respuestaGithub(RELEASE);
    await checkForUpdate({ current: '1.0.0', now: AHORA, fetchImpl: consulta });
    await checkForUpdate({ current: '1.0.0', now: AHORA + 3_600_000, fetchImpl: consulta });

    expect(consulta).toHaveBeenCalledTimes(1);
  });

  it('vuelve a consultar pasadas las doce horas', async () => {
    const consulta = respuestaGithub(RELEASE);
    await checkForUpdate({ current: '1.0.0', now: AHORA, fetchImpl: consulta });
    await checkForUpdate({
      current: '1.0.0',
      now: AHORA + CHECK_THROTTLE_MS + 1,
      fetchImpl: consulta,
    });

    expect(consulta).toHaveBeenCalledTimes(2);
  });

  it('el chequeo manual ignora el throttle', async () => {
    const consulta = respuestaGithub(RELEASE);
    await checkForUpdate({ current: '1.0.0', now: AHORA, fetchImpl: consulta });
    const info = await checkForUpdate({
      current: '1.0.0',
      now: AHORA,
      force: true,
      fetchImpl: consulta,
    });

    expect(consulta).toHaveBeenCalledTimes(2);
    expect(info?.version).toBe('1.2.0');
  });

  it('respeta una versión descartada', async () => {
    await dismissUpdate('1.2.0');
    const info = await checkForUpdate({
      current: '1.0.0',
      now: AHORA,
      fetchImpl: respuestaGithub(RELEASE),
    });
    expect(info).toBeNull();
  });

  it('vuelve a avisar cuando sale una versión posterior a la descartada', async () => {
    await dismissUpdate('1.2.0');
    const info = await checkForUpdate({
      current: '1.0.0',
      now: AHORA,
      fetchImpl: respuestaGithub({ ...RELEASE, tag_name: 'v1.3.0' }),
    });
    expect(info?.version).toBe('1.3.0');
  });

  it('el chequeo manual muestra incluso una versión descartada', async () => {
    await dismissUpdate('1.2.0');
    const info = await checkForUpdate({
      current: '1.0.0',
      now: AHORA,
      force: true,
      fetchImpl: respuestaGithub(RELEASE),
    });
    expect(info?.version).toBe('1.2.0');
  });

  it('guarda la marca del último chequeo aunque no haya novedades', async () => {
    await checkForUpdate({
      current: '9.9.9',
      now: AHORA,
      fetchImpl: respuestaGithub(RELEASE),
    });
    expect(await settingsRepo.get(CLAVE_ULTIMO_CHEQUEO, 0)).toBe(AHORA);
  });
});

describe('dismissUpdate', () => {
  it('recuerda la versión descartada', async () => {
    await dismissUpdate('2.0.0');
    expect(await settingsRepo.get(CLAVE_VERSION_DESCARTADA, '')).toBe('2.0.0');
  });
});
