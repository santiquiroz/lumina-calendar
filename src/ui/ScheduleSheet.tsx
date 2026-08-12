import { useState } from 'react';
import { nodesRepo } from '@/data/nodesRepo';
import { toCalendarDay } from '@/domain/calendarDay';
import { DomainError } from '@/domain/errors';
import { useNode } from '@/hooks/useNodes';
import { useUiStore } from '@/store/uiStore';
import type { NodeId } from '@/domain/types';
import { Button } from './Button';
import { Sheet } from './Sheet';

function horaLocal(fecha: Date): string {
  return `${`${fecha.getHours()}`.padStart(2, '0')}:${`${fecha.getMinutes()}`.padStart(2, '0')}`;
}

function combinar(dia: string, hora: string): string {
  const [anio, mes, numero] = dia.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  return new Date(anio, mes - 1, numero, h, m).toISOString();
}

export function ScheduleSheet() {
  const nodoId = useUiStore((estado) => estado.nodoParaProgramar);
  const cerrar = useUiStore((estado) => estado.cerrarProgramacion);

  return (
    <Sheet abierta={nodoId !== null} titulo="Darle un lugar en el tiempo" onClose={cerrar}>
      {nodoId !== null ? (
        <FormularioProgramacion key={nodoId} nodoId={nodoId} onListo={cerrar} />
      ) : null}
    </Sheet>
  );
}

interface FormularioProgramacionProps {
  nodoId: NodeId;
  onListo(): void;
}

// El estado se inicializa al montar, no en un efecto: montar con key={nodoId}
// evita que un efecto pise valores que la persona ya escribió.
function FormularioProgramacion({ nodoId, onListo }: FormularioProgramacionProps) {
  const nodo = useNode(nodoId);
  const [dia, setDia] = useState(() => toCalendarDay(new Date()));
  const [inicio, setInicio] = useState(() => horaLocal(new Date()));
  const [fin, setFin] = useState(() => horaLocal(new Date(Date.now() + 60 * 60_000)));
  const [error, setError] = useState('');

  async function programar(): Promise<void> {
    try {
      await nodesRepo.schedule(nodoId, {
        start: combinar(dia, inicio),
        end: combinar(dia, fin),
        allDay: false,
      });
      onListo();
    } catch (fallo) {
      setError(
        fallo instanceof DomainError
          ? 'La hora de fin tiene que ser posterior a la de inicio.'
          : 'No pudimos guardar el horario. Probá de nuevo.',
      );
    }
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        void programar();
      }}
      className="flex flex-col gap-4"
    >
      {nodo ? (
        <p className="rounded-[length:var(--radius-md)] bg-surface-low px-3 py-2 text-[length:var(--text-body-md)] text-on-surface">
          {nodo.text}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-[length:var(--text-label-md)] text-on-surface-variant">
        Día
        <input
          type="date"
          value={dia}
          onChange={(evento) => setDia(evento.target.value)}
          className="min-h-11 rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-3 text-on-surface"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-[length:var(--text-label-md)] text-on-surface-variant">
          Empieza
          <input
            type="time"
            value={inicio}
            onChange={(evento) => setInicio(evento.target.value)}
            className="min-h-11 rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-3 text-on-surface"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[length:var(--text-label-md)] text-on-surface-variant">
          Termina
          <input
            type="time"
            value={fin}
            onChange={(evento) => setFin(evento.target.value)}
            className="min-h-11 rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-3 text-on-surface"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-[length:var(--text-body-sm)] text-accent">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg">
        Programar
      </Button>
    </form>
  );
}
