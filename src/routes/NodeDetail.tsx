import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { nodesRepo } from '@/data/nodesRepo';
import { formatDayLong, formatHour, toCalendarDay } from '@/domain/calendarDay';
import { isSubtreeComplete } from '@/domain/progress';
import { useNode, useProgress, useTreeIndex } from '@/hooks/useNodes';
import { useNow } from '@/hooks/useNow';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/ui/Button';
import { CelebrationSheet } from '@/ui/CelebrationSheet';
import { Chip } from '@/ui/Chip';
import { DualProgress } from '@/ui/DualProgress';
import { IconButton } from '@/ui/IconButton';
import { Outliner } from '@/ui/Outliner';
import { IconArrowBack, IconClock, IconTarget, IconTrash } from '@/ui/icons';

export function NodeDetail() {
  const { id } = useParams();
  const navegar = useNavigate();
  const nodo = useNode(id);
  const index = useTreeIndex();
  const progreso = useProgress(id);
  const ahora = useNow();
  const abrirProgramacion = useUiStore((estado) => estado.abrirProgramacion);
  const [celebrando, setCelebrando] = useState(false);
  const [celebrado, setCelebrado] = useState(false);

  const completo = isSubtreeComplete(progreso);

  useEffect(() => {
    if (completo && !celebrado) {
      setCelebrando(true);
      setCelebrado(true);
    }
    if (!completo && celebrado) setCelebrado(false);
  }, [completo, celebrado]);

  if (!nodo) {
    return (
      <section className="px-4 py-10 text-center text-on-surface-variant">
        <p>Esta carpeta ya no está disponible.</p>
        <Link to="/" className="mt-3 inline-block text-primary underline">
          Volver al día
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-3">
      <header className="flex items-center justify-between">
        <IconButton label="Volver" onClick={() => navegar(-1)}>
          <IconArrowBack />
        </IconButton>
        <div className="flex items-center gap-1">
          <IconButton label="Cambiar horario" onClick={() => abrirProgramacion(nodo.id)}>
            <IconClock size={20} />
          </IconButton>
          <IconButton
            label="Descartar carpeta"
            onClick={() => {
              void nodesRepo.softDelete(nodo.id).then(() => navegar('/'));
            }}
          >
            <IconTrash size={20} />
          </IconButton>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <h1 className="text-[length:var(--text-headline-lg)] font-semibold tracking-tight text-on-surface">
          {nodo.text || 'Sin título'}
        </h1>

        {nodo.schedule ? (
          <p className="text-[length:var(--text-body-sm)] text-on-surface-variant first-letter:uppercase">
            {formatDayLong(toCalendarDay(nodo.schedule.start))} · {formatHour(nodo.schedule.start)} -{' '}
            {formatHour(nodo.schedule.end)}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Chip>Sin fecha</Chip>
            <Button variant="suave" onClick={() => abrirProgramacion(nodo.id)}>
              Darle un lugar
            </Button>
          </div>
        )}

        <DualProgress progreso={progreso} schedule={nodo.schedule} now={ahora} />

        {progreso.total > 0 ? (
          <Link
            to={`/nodo/${nodo.id}/foco`}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-[length:var(--radius-md)] bg-primary/10 px-4 font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <IconTarget size={20} />
            Modo foco
          </Link>
        ) : null}
      </div>

      <hr className="border-outline-variant/30" />

      <Outliner rootId={nodo.id} index={index} />

      <CelebrationSheet
        abierta={celebrando}
        titulo={nodo.text}
        progreso={progreso}
        onClose={() => setCelebrando(false)}
      />
    </section>
  );
}
