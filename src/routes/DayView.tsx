import { addDays, formatDayLong, toCalendarDay } from '@/domain/calendarDay';
import { useDayNodes, useTreeIndex } from '@/hooks/useNodes';
import { useNow } from '@/hooks/useNow';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/ui/Button';
import { DayStrip } from '@/ui/DayStrip';
import { EmptyState } from '@/ui/EmptyState';
import { EventBlock } from '@/ui/EventBlock';
import { IconButton } from '@/ui/IconButton';
import { NowIndicator } from '@/ui/NowIndicator';
import { TimelineGrid } from '@/ui/TimelineGrid';
import { IconAdd, IconChevronDown, IconChevronRight, IconSparkles } from '@/ui/icons';

export function DayView() {
  const dia = useUiStore((estado) => estado.diaSeleccionado);
  const seleccionarDia = useUiStore((estado) => estado.seleccionarDia);
  const abrirEventoNuevo = useUiStore((estado) => estado.abrirEventoNuevo);
  const eventos = useDayNodes(dia);
  const index = useTreeIndex();
  const ahora = useNow();
  const esHoy = dia === toCalendarDay(ahora);

  return (
    <section aria-labelledby="titulo-dia" className="flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <h1
            id="titulo-dia"
            className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface first-letter:uppercase"
          >
            {formatDayLong(dia)}
          </h1>
          <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
            {eventos.length === 0
              ? 'Sin bloques por ahora'
              : `${eventos.length} ${eventos.length === 1 ? 'bloque' : 'bloques'}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="suave" onClick={abrirEventoNuevo} className="mr-1">
            <IconAdd size={20} />
            Nuevo evento
          </Button>
          <IconButton label="Día anterior" onClick={() => seleccionarDia(addDays(dia, -1))}>
            <span className="rotate-180">
              <IconChevronRight size={20} />
            </span>
          </IconButton>
          <IconButton label="Ir a hoy" onClick={() => seleccionarDia(toCalendarDay(new Date()))}>
            <IconChevronDown size={20} />
          </IconButton>
          <IconButton label="Día siguiente" onClick={() => seleccionarDia(addDays(dia, 1))}>
            <IconChevronRight size={20} />
          </IconButton>
        </div>
      </header>

      <DayStrip seleccionado={dia} onSelect={seleccionarDia} />

      {eventos.length === 0 ? (
        <EmptyState
          icono={<IconSparkles size={32} />}
          titulo="Nada agendado en este día"
          descripcion="Un día en blanco también es un plan. Cuando quieras, creá un evento o capturá una idea y programala sin apuro."
          accion={<Button onClick={abrirEventoNuevo}>Crear un evento</Button>}
        />
      ) : (
        <div className="relative px-2 pt-2">
          <TimelineGrid>
            {eventos.map((evento) => (
              <EventBlock key={evento.id} node={evento} index={index} now={ahora} />
            ))}
            {esHoy ? <NowIndicator now={ahora} /> : null}
          </TimelineGrid>
        </div>
      )}
    </section>
  );
}
