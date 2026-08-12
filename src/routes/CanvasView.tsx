import { Link } from 'react-router';
import { nodesRepo } from '@/data/nodesRepo';
import { useIdeas } from '@/hooks/useNodes';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { IconButton } from '@/ui/IconButton';
import { IconChevronRight, IconClock, IconSparkles, IconTrash } from '@/ui/icons';

export function CanvasView() {
  const ideas = useIdeas();
  const abrirCaptura = useUiStore((estado) => estado.abrirCaptura);
  const abrirProgramacion = useUiStore((estado) => estado.abrirProgramacion);

  return (
    <section aria-labelledby="titulo-canvas" className="px-4 py-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1
            id="titulo-canvas"
            className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface"
          >
            Idea Canvas
          </h1>
          <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
            Todo lo que sacaste de la cabeza y todavía no tiene hora.
          </p>
        </div>
        <Button variant="suave" onClick={abrirCaptura}>
          Capturar
        </Button>
      </header>

      {ideas.length === 0 ? (
        <EmptyState
          icono={<IconSparkles size={32} />}
          titulo="Tu canvas está limpio"
          descripcion="Cuando algo te dé vueltas, guardalo acá con la tecla c. No necesita fecha ni forma todavía."
          accion={<Button onClick={abrirCaptura}>Capturar una idea</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <Card className="flex items-center gap-2">
                <Link
                  to={`/nodo/${idea.id}`}
                  className="min-w-0 flex-1 text-[length:var(--text-body-md)] text-on-surface hover:text-primary"
                >
                  <span className="line-clamp-2">{idea.text}</span>
                </Link>
                <IconButton label="Programar" onClick={() => abrirProgramacion(idea.id)}>
                  <IconClock size={20} />
                </IconButton>
                <Link
                  to={`/nodo/${idea.id}`}
                  aria-label="Abrir como carpeta"
                  title="Abrir como carpeta"
                  className="inline-flex size-11 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-150 hover:bg-surface-low hover:text-on-surface"
                >
                  <IconChevronRight size={20} />
                </Link>
                <IconButton
                  label="Descartar"
                  onClick={() => {
                    void nodesRepo.softDelete(idea.id);
                  }}
                >
                  <IconTrash size={20} />
                </IconButton>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
