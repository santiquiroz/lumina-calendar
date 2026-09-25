import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { formatHour } from '@/domain/calendarDay';
import type { DayBlock } from '@/domain/dayLayout';
import { subtreeProgress } from '@/domain/progress';
import { horarioArrastrado, minutosPorDesplazamiento, pixelesEntre } from '@/domain/reschedule';
import { formatRemaining, timeState } from '@/domain/time';
import type { TreeIndex } from '@/domain/tree';
import type { LuminaNode, Schedule } from '@/domain/types';
import { ImportedDot } from './ImportedDot';
import { HOUR_HEIGHT_PX } from './TimelineGrid';
import { useArrastreVertical } from './useVerticalDrag';

const PASO_MINUTOS = 15;
const GRILLA_DE_ARRASTRE = { hourHeightPx: HOUR_HEIGHT_PX, stepMinutes: PASO_MINUTOS };
const MINUTOS_POR_TECLA: Partial<Record<string, number>> = {
  ArrowUp: -PASO_MINUTOS,
  ArrowDown: PASO_MINUTOS,
};
const AYUDA_MOVER_ID = 'ayuda-mover-bloque';

const TONOS: Record<string, string> = {
  upcoming: 'bg-surface-low border-l-primary/60 text-on-surface',
  calm: 'bg-primary/10 border-l-primary text-on-surface',
  amber: 'bg-amber-container border-l-amber text-on-amber-container',
  ended: 'bg-surface-low border-l-outline-variant text-on-surface-variant',
};

export type BlockPosition = Pick<DayBlock, 'top' | 'height' | 'left' | 'width'>;

export interface EventBlockProps {
  node: LuminaNode;
  position: BlockPosition;
  index: TreeIndex;
  now: Date;
  onMover?(minutos: number): void;
}

// 0.5rem de margen a cada lado de la columna de eventos y 2px de aire entre columnas.
function styleFor({ top, height, left, width }: BlockPosition): CSSProperties {
  return {
    top,
    height,
    left: `calc(0.5rem + (100% - 1rem) * ${left})`,
    width: `calc((100% - 1rem) * ${width} - 2px)`,
  };
}

function styleArrastrado(position: BlockPosition, desplazamientoPx: number): CSSProperties {
  return { ...styleFor(position), transform: `translateY(${desplazamientoPx}px)`, zIndex: 10 };
}

function estiloDelBloque(
  position: BlockPosition,
  guardado: Schedule,
  visible: Schedule,
  arrastrando: boolean,
): CSSProperties {
  if (!arrastrando) return styleFor(position);
  return styleArrastrado(position, pixelesEntre(guardado, visible, HOUR_HEIGHT_PX));
}

const CLASES_MOVIBLE = 'touch-manipulation select-none [-webkit-touch-callout:none]';

function clasesDeMovimiento(movible: boolean, arrastrando: boolean): string {
  if (arrastrando) return `${CLASES_MOVIBLE} cursor-grabbing shadow-lg`;
  if (movible) return `${CLASES_MOVIBLE} cursor-grab`;
  return '';
}

function horarioVisible(guardado: Schedule, desplazamientoPx: number | null): Schedule {
  if (desplazamientoPx === null) return guardado;
  return horarioArrastrado(guardado, desplazamientoPx, GRILLA_DE_ARRASTRE);
}

export function AyudaMoverBloque() {
  return (
    <p id={AYUDA_MOVER_ID} className="sr-only">
      Movelo con las flechas arriba y abajo, de a {PASO_MINUTOS} minutos, o arrastralo.
    </p>
  );
}

function soltarCon(onMover: EventBlockProps['onMover']) {
  if (!onMover) return undefined;
  return (deltaPx: number) => {
    const minutos = minutosPorDesplazamiento(deltaPx, GRILLA_DE_ARRASTRE);
    if (minutos !== 0) onMover(minutos);
  };
}

function teclaCon(onMover: EventBlockProps['onMover']) {
  return (evento: KeyboardEvent<HTMLAnchorElement>) => {
    const minutos = MINUTOS_POR_TECLA[evento.key];
    if (!onMover || minutos === undefined) return;
    evento.preventDefault();
    onMover(minutos);
  };
}

export function EventBlock({ node, position, index, now, onMover }: EventBlockProps) {
  const guardado = node.schedule as Schedule;
  const arrastre = useArrastreVertical<HTMLAnchorElement>(soltarCon(onMover));
  const arrastrando = arrastre.desplazamientoPx !== null;
  const schedule = horarioVisible(guardado, arrastre.desplazamientoPx);
  const estado = timeState(guardado, now);
  const progreso = subtreeProgress(index, node.id);

  return (
    <Link
      ref={arrastre.ref}
      to={`/nodo/${node.id}`}
      draggable={false}
      data-time-state={estado}
      data-arrastrando={arrastrando ? 'true' : undefined}
      aria-describedby={onMover ? AYUDA_MOVER_ID : undefined}
      aria-keyshortcuts={onMover ? 'ArrowUp ArrowDown' : undefined}
      onKeyDown={teclaCon(onMover)}
      {...arrastre.manejadores}
      className={`absolute flex flex-col gap-1 overflow-hidden rounded-[length:var(--radius-md)] border-l-4 px-3 py-2 transition-colors duration-200 hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${clasesDeMovimiento(onMover !== undefined, arrastrando)} ${TONOS[estado]}`}
      style={estiloDelBloque(position, guardado, schedule, arrastrando)}
    >
      <span className="flex items-center gap-1.5 truncate text-[length:var(--text-label-md)] font-semibold">
        <ImportedDot node={node} />
        <span className="truncate">{node.text}</span>
      </span>
      <span className="truncate text-[length:var(--text-label-sm)] opacity-80">
        {formatHour(schedule.start)} - {formatHour(schedule.end)}
        {progreso.total > 0 ? ` · ${progreso.done}/${progreso.total} tareas` : ''}
      </span>
      {estado === 'amber' ? (
        <span className="truncate text-[length:var(--text-label-sm)] font-medium">
          {formatRemaining(guardado, now)}
        </span>
      ) : null}
    </Link>
  );
}
