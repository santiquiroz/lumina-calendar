import { useUpdate } from '@/hooks/useUpdate';
import { Button } from './Button';
import { Card } from './Card';
import { IconDownload } from './icons';

const MENSAJES: Record<string, string> = {
  buscando: 'Buscando…',
  'al-dia': 'Estás en la última versión.',
  'sin-red': 'Sin conexión. Probá de nuevo cuando tengas red.',
};

export function UpdateSection() {
  const { disponible, estado, versionInstalada, buscar, descartar } = useUpdate(false);
  const mensaje = MENSAJES[estado];

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-[length:var(--text-body-lg)] font-semibold text-on-surface">Versión</h2>

      <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
        Tenés instalada la {versionInstalada || '…'}. Lumina mira las publicaciones del repositorio
        dos veces al día; si no hay red, no pasa nada.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="suave" onClick={() => void buscar()} disabled={estado === 'buscando'}>
          Buscar actualizaciones
        </Button>
        {mensaje ? (
          <p role="status" className="text-[length:var(--text-body-sm)] text-on-surface-variant">
            {mensaje}
          </p>
        ) : null}
      </div>

      {disponible ? (
        <div className="flex flex-col gap-2 rounded-[length:var(--radius-md)] bg-primary/10 px-3 py-3">
          <p className="text-[length:var(--text-label-md)] font-semibold text-on-surface">
            Hay una versión nueva: {disponible.version}
          </p>
          {disponible.notes ? (
            <p className="line-clamp-4 text-[length:var(--text-body-sm)] whitespace-pre-line text-on-surface-variant">
              {disponible.notes}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={disponible.apkUrl ?? disponible.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-[length:var(--radius-md)] bg-primary px-4 text-[length:var(--text-label-md)] font-semibold text-on-primary"
            >
              <IconDownload size={20} />
              Descargar
            </a>
            <Button variant="fantasma" onClick={() => void descartar()}>
              Ahora no
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
