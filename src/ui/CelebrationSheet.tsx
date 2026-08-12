import type { Progress } from '@/domain/progress';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { IconFolderCheck } from './icons';

export interface CelebrationSheetProps {
  abierta: boolean;
  titulo: string;
  progreso: Progress;
  onClose(): void;
}

export function CelebrationSheet({ abierta, titulo, progreso, onClose }: CelebrationSheetProps) {
  return (
    <Sheet abierta={abierta} titulo="Carpeta completa" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary motion-safe:animate-pulse">
          <IconFolderCheck size={40} />
        </span>
        <p className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface">
          Cerraste «{titulo}»
        </p>
        <p className="max-w-xs text-[length:var(--text-body-sm)] text-on-surface-variant">
          {progreso.total} {progreso.total === 1 ? 'tarea completada' : 'tareas completadas'}. Podés
          soltar esto y seguir con lo próximo.
        </p>
        <Button onClick={onClose} size="lg">
          Listo
        </Button>
      </div>
    </Sheet>
  );
}
