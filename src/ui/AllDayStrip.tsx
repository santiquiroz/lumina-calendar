import { Link } from 'react-router';
import type { LuminaNode } from '@/domain/types';
import { ImportedDot } from './ImportedDot';

function AllDayChip({ node }: { node: LuminaNode }) {
  return (
    <Link
      to={`/nodo/${node.id}`}
      className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-3 text-[length:var(--text-label-md)] font-semibold text-on-surface transition-colors duration-200 hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ImportedDot node={node} />
      <span className="truncate">{node.text}</span>
    </Link>
  );
}

export function AllDayStrip({ nodes }: { nodes: LuminaNode[] }) {
  if (nodes.length === 0) return null;

  return (
    <section aria-labelledby="titulo-todo-el-dia" className="flex items-start gap-2 px-2 pt-2">
      <h2
        id="titulo-todo-el-dia"
        className="w-16 shrink-0 pt-3 pr-3 text-right text-[length:var(--text-label-sm)] text-on-surface-variant/70"
      >
        Todo el día
      </h2>
      <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
        {nodes.map((nodo) => (
          <li key={nodo.id} className="max-w-full">
            <AllDayChip node={nodo} />
          </li>
        ))}
      </ul>
    </section>
  );
}
