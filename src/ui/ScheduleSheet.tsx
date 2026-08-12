import { useEffect, useState } from 'react';
import { nodesRepo } from '@/data/nodesRepo';
import { toCalendarDay } from '@/domain/calendarDay';
import { DomainError } from '@/domain/errors';
import { useNode } from '@/hooks/useNodes';
import { useUiStore } from '@/store/uiStore';
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
  const nodo = useNode(nodoId ?? undefined);

  const [dia, setDia] = useState(() => toCalendarDay(new Date()));
  const [inicio, setInicio] = useState('09:00');
  const [fin, setFin] = useState('10:00');
  const [error, setError] = useState('');

  useEffect(() => {
    if (nodoId === null) return;
    const ahora = new Date();
    const siguiente = new Date(ahora.getTime() + 60 * 60_000);
    setDia(toCalendarDay(ahora));
    setInicio(horaLocal(ahora));
    setFin(horaLocal(siguiente));
    setError('');
  }, [nodoId]);

  async function programar(): Promise<void> {
    if (!nodoId) return;
    try {
      await nodesRepo.schedule(nodoId, {
        start: combinar(dia, inicio),
        end: combinar(dia, fin),
        allDay: false,
      });
      cerrar();
    } catch (fallo) {
      setError(
        fallo instanceof DomainError
          ? 'La hora de fin tiene que ser posterior a la de inicio.'
          : 'No pudimos guardar el horario. Probá de nuevo.',
      );
    }
  }

  return (
    <Sheet abierta={nodoId !== null} titulo="Darle un lugar en el tiempo" onClose={cerrar}>
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
    </Sheet>
  );
}
