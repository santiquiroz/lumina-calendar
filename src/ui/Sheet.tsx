import { useEffect, useRef, type ReactNode } from 'react';
import { IconClose } from './icons';
import { IconButton } from './IconButton';

export interface SheetProps {
  abierta: boolean;
  titulo: string;
  onClose(): void;
  children: ReactNode;
}

export function Sheet({ abierta, titulo, onClose, children }: SheetProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<Element | null>(null);

  useEffect(() => {
    if (!abierta) return undefined;

    disparador.current = document.activeElement;
    contenedor.current?.focus();

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      (disparador.current as HTMLElement | null)?.focus?.();
    };
  }, [abierta, onClose]);

  if (!abierta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/25 backdrop-blur-sm sm:items-center">
      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className="w-full max-w-md rounded-t-[length:var(--radius-xl)] bg-surface-lowest p-5 shadow-[0_-8px_32px_-12px_rgba(11,28,48,0.35)] outline-none sm:rounded-[length:var(--radius-xl)]"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface">
            {titulo}
          </h2>
          <IconButton label="Cerrar" onClick={onClose}>
            <IconClose size={20} />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  );
}
