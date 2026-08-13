import { isNewer, normalizeVersion } from '@/domain/version';
import { settingsRepo } from './settingsRepo';

export const RELEASES_API =
  'https://api.github.com/repos/santiquiroz/lumina-calendar/releases/latest';

export const CHECK_THROTTLE_MS = 12 * 3_600_000;
export const TIMEOUT_MS = 8_000;

export const CLAVE_ULTIMO_CHEQUEO = 'actualizacion.ultimoChequeo';
export const CLAVE_VERSION_DESCARTADA = 'actualizacion.versionDescartada';

export interface UpdateInfo {
  version: string;
  releaseUrl: string;
  apkUrl: string | null;
  notes: string;
}

interface ReleaseJson {
  tag_name?: string;
  html_url?: string;
  body?: string;
  assets?: { name?: string; browser_download_url?: string }[];
}

export interface CheckOptions {
  current: string;
  force?: boolean;
  now?: number;
  fetchImpl?: typeof fetch;
}

function mapRelease(json: ReleaseJson): UpdateInfo | null {
  const etiqueta = json.tag_name?.trim();
  if (!etiqueta) return null;

  const apk = json.assets?.find((activo) => activo.name?.endsWith('.apk'))?.browser_download_url;

  return {
    version: normalizeVersion(etiqueta),
    releaseUrl: json.html_url ?? '',
    apkUrl: apk ?? null,
    notes: (json.body ?? '').slice(0, 600),
  };
}

// Sin red no pasa nada: cualquier fallo devuelve null y la app sigue igual.
export async function fetchLatestRelease(fetchImpl: typeof fetch = fetch): Promise<UpdateInfo | null> {
  const cancelar = AbortSignal.timeout(TIMEOUT_MS);

  try {
    const respuesta = await fetchImpl(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: cancelar,
    });
    if (!respuesta.ok) return null;
    return mapRelease((await respuesta.json()) as ReleaseJson);
  } catch {
    return null;
  }
}

export async function checkForUpdate({
  current,
  force = false,
  now = Date.now(),
  fetchImpl = fetch,
}: CheckOptions): Promise<UpdateInfo | null> {
  if (!force) {
    const ultimo = await settingsRepo.get(CLAVE_ULTIMO_CHEQUEO, 0);
    if (now - ultimo < CHECK_THROTTLE_MS) return null;
  }

  const ultima = await fetchLatestRelease(fetchImpl);
  await settingsRepo.set(CLAVE_ULTIMO_CHEQUEO, now);
  if (!ultima) return null;

  if (!isNewer(ultima.version, current)) return null;

  if (!force) {
    const descartada = await settingsRepo.get(CLAVE_VERSION_DESCARTADA, '');
    if (descartada === ultima.version) return null;
  }

  return ultima;
}

export async function dismissUpdate(version: string): Promise<void> {
  await settingsRepo.set(CLAVE_VERSION_DESCARTADA, version);
}
