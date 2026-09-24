import type { LuminaNode } from '@/domain/types';

export function ImportedDot({ node }: { node: LuminaNode }) {
  if (node.source === 'lumina') return null;

  return (
    <span
      aria-label={`Importado de ${node.externalCalendar ?? 'otro calendario'}`}
      title={node.externalCalendar ?? 'Importado'}
      className="size-1.5 shrink-0 rounded-full bg-current opacity-60"
    />
  );
}
