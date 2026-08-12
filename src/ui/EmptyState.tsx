import type { ReactNode } from 'react';

export interface EmptyStateProps {
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
  icono?: ReactNode;
}

export function EmptyState({ titulo, descripcion, accion, icono }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icono ? <span className="text-primary/60">{icono}</span> : null}
      <p className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface">
        {titulo}
      </p>
      <p className="max-w-sm text-[length:var(--text-body-sm)] text-on-surface-variant">
        {descripcion}
      </p>
      {accion}
    </div>
  );
}
