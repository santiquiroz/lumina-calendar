import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { nodesRepo } from '@/data/nodesRepo';
import { nextPendingTask, pendingCount } from '@/domain/focus';
import { formatRemaining } from '@/domain/time';
import { useNode, useProgress, useTreeIndex } from '@/hooks/useNodes';
import { useNow } from '@/hooks/useNow';
import { Button } from '@/ui/Button';
import { CelebrationSheet } from '@/ui/CelebrationSheet';
import { IconButton } from '@/ui/IconButton';
import { ProgressBar } from '@/ui/ProgressBar';
import { IconArrowBack, IconCheck } from '@/ui/icons';

export function FocusMode() {
  const { id } = useParams();
  const navegar = useNavigate();
  const nodo = useNode(id);
  const index = useTreeIndex();
  const progreso = useProgress(id);
  const ahora = useNow(15_000);
  const [celebrando, setCelebrando] = useState(false);

  const pendiente = id ? nextPendingTask(index, id) : null;
  const restantes = id ? pendingCount(index, id) : 0;

  if (!nodo) {
    return (
      <section className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-on-surface-variant">Esta carpeta ya no está disponible.</p>
        <Link to="/" className="text-primary underline">
          Volver al día
        </Link>
      </section>
    );
  }

  return (
    <section className="flex min-h-dvh flex-col bg-surface px-6 py-5">
      <header className="flex items-center justify-between">
        <IconButton label="Salir del modo foco" onClick={() => navegar(`/nodo/${nodo.id}`)}>
          <IconArrowBack />
        </IconButton>
        <p className="text-[length:var(--text-label-md)] text-on-surface-variant">
          {nodo.schedule ? formatRemaining(nodo.schedule, ahora) : 'Sin límite de tiempo'}
        </p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="w-full max-w-sm">
          <ProgressBar value={progreso.ratio} label="Progreso de tareas" />
          <p className="mt-2 text-[length:var(--text-label-sm)] text-on-surface-variant">
            {restantes === 0
              ? 'Todo cerrado'
              : `${restantes} ${restantes === 1 ? 'tarea pendiente' : 'tareas pendientes'}`}
          </p>
        </div>

        {pendiente ? (
          <>
            <p className="max-w-lg text-[length:var(--text-headline-lg)] leading-tight font-semibold text-on-surface">
              {pendiente.text || 'Subtarea sin título'}
            </p>
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={() => {
                  void nodesRepo.toggleDone(pendiente.id).then(() => {
                    if (restantes <= 1) setCelebrando(true);
                  });
                }}
              >
                <IconCheck size={20} />
                Está hecha
              </Button>
              <Link
                to={`/nodo/${nodo.id}`}
                className="min-h-11 px-4 text-[length:var(--text-body-sm)] text-on-surface-variant underline"
              >
                Ver la carpeta completa
              </Link>
            </div>
          </>
        ) : (
          <p className="max-w-md text-[length:var(--text-headline-md)] font-semibold text-on-surface">
            No queda nada pendiente acá. Podés soltar esto.
          </p>
        )}
      </div>

      <CelebrationSheet
        abierta={celebrando}
        titulo={nodo.text}
        progreso={progreso}
        onClose={() => {
          setCelebrando(false);
          navegar(`/nodo/${nodo.id}`);
        }}
      />
    </section>
  );
}
