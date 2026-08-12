import { useMemo } from 'react';
import { Link } from 'react-router';
import { formatDayLong, formatHour, toCalendarDay, type CalendarDay } from '@/domain/calendarDay';
import { subtreeProgress } from '@/domain/progress';
import { timeState } from '@/domain/time';
import type { LuminaNode } from '@/domain/types';
import { useAllNodes, useTreeIndex } from '@/hooks/useNodes';
import { useNow } from '@/hooks/useNow';
import { EmptyState } from '@/ui/EmptyState';
import { IconAgenda } from '@/ui/icons';

function agruparPorDia(nodos: LuminaNode[]): [CalendarDay, LuminaNode[]][] {
  const grupos = new Map<CalendarDay, LuminaNode[]>();

  for (const nodo of nodos) {
    if (!nodo.schedule || nodo.parentId !== null || nodo.deletedAt !== null) continue;
    const dia = toCalendarDay(nodo.schedule.start);
    grupos.set(dia, [...(grupos.get(dia) ?? []), nodo]);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([dia, lista]) =>
        [
          dia,
          [...lista].sort((a, b) => (a.schedule?.start ?? '').localeCompare(b.schedule?.start ?? '')),
        ] as [CalendarDay, LuminaNode[]],
    );
}

export function AgendaView() {
  const nodos = useAllNodes();
  const index = useTreeIndex();
  const ahora = useNow();
  const hoy = toCalendarDay(ahora);

  const grupos = useMemo(
    () => agruparPorDia(nodos).filter(([dia]) => dia >= hoy),
    [nodos, hoy],
  );

  if (grupos.length === 0) {
    return (
      <EmptyState
        icono={<IconAgenda size={32} />}
        titulo="La agenda está despejada"
        descripcion="No hay bloques por delante. Cuando programes una idea, aparecerá acá."
      />
    );
  }

  return (
    <section aria-labelledby="titulo-agenda" className="px-4 py-4">
      <h1
        id="titulo-agenda"
        className="mb-3 text-[length:var(--text-headline-sm)] font-semibold text-on-surface"
      >
        Agenda
      </h1>

      <div className="flex flex-col gap-5">
        {grupos.map(([dia, eventos]) => (
          <div key={dia}>
            <h2 className="sticky top-0 bg-surface/95 py-1 text-[length:var(--text-label-md)] font-semibold text-on-surface-variant backdrop-blur first-letter:uppercase">
              {dia === hoy ? 'Hoy' : formatDayLong(dia)}
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {eventos.map((evento) => {
                const progreso = subtreeProgress(index, evento.id);
                const estado = evento.schedule ? timeState(evento.schedule, ahora) : 'upcoming';
                return (
                  <li key={evento.id}>
                    <Link
                      to={`/nodo/${evento.id}`}
                      data-time-state={estado}
                      className="flex items-center gap-3 rounded-[length:var(--radius-md)] border-l-4 border-l-primary bg-surface-lowest px-3 py-3 transition-colors hover:bg-surface-low"
                    >
                      <span className="w-14 shrink-0 text-[length:var(--text-label-sm)] tabular-nums text-on-surface-variant">
                        {formatHour(evento.schedule?.start ?? '')}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-on-surface">{evento.text}</span>
                      {progreso.total > 0 ? (
                        <span className="text-[length:var(--text-label-sm)] tabular-nums text-on-surface-variant">
                          {progreso.done}/{progreso.total}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
