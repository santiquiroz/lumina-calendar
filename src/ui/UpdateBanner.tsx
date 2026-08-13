import type { UpdateInfo } from '@/data/updateRepo';
import { IconButton } from './IconButton';
import { IconClose, IconDownload } from './icons';

export interface UpdateBannerProps {
  info: UpdateInfo;
  onDismiss(): void;
}

export function UpdateBanner({ info, onDismiss }: UpdateBannerProps) {
  return (
    <aside
      aria-label="Actualización disponible"
      className="mx-4 mt-3 flex items-center gap-3 rounded-[length:var(--radius-lg)] bg-primary/10 px-4 py-3"
    >
      <span className="text-primary">
        <IconDownload size={22} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--text-label-md)] font-semibold text-on-surface">
          Hay una versión nueva: {info.version}
        </p>
        <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
          Descargala cuando quieras. Tus datos se quedan donde están.
        </p>
      </div>

      <a
        href={info.apkUrl ?? info.releaseUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center rounded-[length:var(--radius-md)] bg-primary px-4 text-[length:var(--text-label-md)] font-semibold text-on-primary"
      >
        Descargar
      </a>

      <IconButton label="Ahora no" onClick={onDismiss}>
        <IconClose size={20} />
      </IconButton>
    </aside>
  );
}
