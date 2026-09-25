import { useCallback, useMemo, useState } from 'react';
import { addDays, formatDayLong, formatHour, toCalendarDay } from '@/domain/calendarDay';
import { layoutDay } from '@/domain/dayLayout';
import type { LuminaNode, Schedule } from '@/domain/types';
import { useDayNodes, useTreeIndex } from '@/hooks/useNodes';
import { useNow } from '@/hooks/useNow';
import { useMoverBloque } from '@/hooks/useReschedule';
import { useUiStore } from '@/store/uiStore';
import { AllDayStrip } from '@/ui/AllDayStrip';
import { Button } from '@/ui/Button';
import { DayStrip } from '@/ui/DayStrip';
import { EmptyState } from '@/ui/EmptyState';
import { AyudaMoverBloque, EventBlock } from '@/ui/EventBlock';
import { IconButton } from '@/ui/IconButton';
import { NowIndicator } from '@/ui/NowIndicator';
import { DAY_GRID, TimelineGrid } from '@/ui/TimelineGrid';
import { IconAdd, IconChevronDown, IconChevronRight, IconSparkles } from '@/ui/icons';

function anuncioDeHorario(texto: string, horario: Schedule): string {
  return `«${texto}» ahora va de ${formatHour(horario.start)} a ${formatHour(horario.end)}.`;
}

function esMovible(nodo: LuminaNode): boolean {
  return nodo.source === 'lumina';
}

function useMoverConAnuncio() {
  const moverBloque = useMoverBloque();
  const [anuncio, setAnuncio] = useState('');

  const mover = useCallback(
    async (nodo: LuminaNode, minutos: number) => {
      try {
        setAnuncio(anuncioDeHorario(nodo.text, await moverBloque(nodo.id, minutos)));
      } catch {
        setAnuncio('No pudimos mover el bloque. Probá de nuevo.');
      }
    },
    [moverBloque],
  );

  return { anuncio, mover };
}

export function DayView() {
  const dia = useUiStore((estado) => estado.diaSeleccionado);
  const seleccionarDia = useUiStore((estado) => estado.seleccionarDia);
  const abrirEventoNuevo = useUiStore((estado) => estado.abrirEventoNuevo);
  const eventos = useDayNodes(dia);
  const distribucion = useMemo(() => layoutDay(eventos, dia, DAY_GRID), [eventos, dia]);
  const index = useTreeIndex();
  const ahora = useNow();
  const esHoy = dia === toCalendarDay(ahora);
  const { anuncio, mover } = useMoverConAnuncio();

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
        <>
          <AllDayStrip nodes={distribucion.allDay} />
          <div className="relative px-2 pt-2">
            <TimelineGrid>
              {distribucion.blocks.map(({ node, ...posicion }) => (
                <EventBlock
                  key={node.id}
                  node={node}
                  position={posicion}
                  index={index}
                  now={ahora}
                  onMover={esMovible(node) ? (minutos) => void mover(node, minutos) : undefined}
                />
              ))}
              {esHoy ? <NowIndicator now={ahora} /> : null}
            </TimelineGrid>
          </div>
          <AyudaMoverBloque />
        </>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </section>
  );
}
