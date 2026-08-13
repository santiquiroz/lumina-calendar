import { useState } from 'react';
import { nodesRepo } from '@/data/nodesRepo';
import { toCalendarDay } from '@/domain/calendarDay';
import { DomainError } from '@/domain/errors';
import type { NodeId } from '@/domain/types';
import { useNode } from '@/hooks/useNodes';
import { useUiStore } from '@/store/uiStore';
import { Button } from './Button';
import { combinarFechaYHora, horaLocal, HorarioFields } from './HorarioFields';
import { Sheet } from './Sheet';

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
        start: combinarFechaYHora(dia, inicio),
        end: combinarFechaYHora(dia, fin),
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

      <HorarioFields
        dia={dia}
        inicio={inicio}
        fin={fin}
        onDia={setDia}
        onInicio={setInicio}
        onFin={setFin}
      />

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
