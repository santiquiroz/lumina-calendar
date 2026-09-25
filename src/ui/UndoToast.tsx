import { useEffect, useState } from 'react';
import { useDeshacerDescarte } from '@/hooks/useDiscard';
import { useUiStore, type DescarteReciente } from '@/store/uiStore';

export const DURACION_AVISO_DESHACER_MS = 6000;

export function UndoToast() {
  const descarte = useUiStore((estado) => estado.descarte);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6"
    >
      {descarte ? <AvisoDescarte key={descarte.id} descarte={descarte} /> : null}
    </div>
  );
}

function AvisoDescarte({ descarte }: { descarte: DescarteReciente }) {
  const cerrarDescarte = useUiStore((estado) => estado.cerrarDescarte);
  const deshacer = useDeshacerDescarte();
  const [enPausa, setEnPausa] = useState(false);

  useEffect(() => {
    if (enPausa) return undefined;
    const temporizador = window.setTimeout(cerrarDescarte, DURACION_AVISO_DESHACER_MS);
    return () => window.clearTimeout(temporizador);
  }, [enPausa, cerrarDescarte]);

  return (
    <div
      onFocus={() => setEnPausa(true)}
      onBlur={() => setEnPausa(false)}
      onMouseEnter={() => setEnPausa(true)}
      onMouseLeave={() => setEnPausa(false)}
      className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-[length:var(--radius-lg)] bg-on-surface py-2 pl-4 pr-2 text-surface shadow-lg"
    >
      <p className="text-[length:var(--text-body-sm)]">{descarte.mensaje}</p>
      <button
        type="button"
        onClick={() => void deshacer(descarte.id)}
        className="min-h-11 rounded-[length:var(--radius-md)] px-3 text-[length:var(--text-label-md)] font-semibold text-primary-container transition-colors duration-150 hover:bg-surface/10"
      >
        Deshacer
      </button>
    </div>
  );
}
