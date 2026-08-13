import { useState } from 'react';
import { nodesRepo } from '@/data/nodesRepo';
import { DomainError } from '@/domain/errors';
import { useUiStore } from '@/store/uiStore';
import { Button } from './Button';
import { combinarFechaYHora, horaLocal, HorarioFields } from './HorarioFields';
import { Sheet } from './Sheet';

export function NewEventSheet() {
  const abierta = useUiStore((estado) => estado.eventoNuevoAbierto);
  const dia = useUiStore((estado) => estado.diaSeleccionado);
  const cerrar = useUiStore((estado) => estado.cerrarEventoNuevo);

  return (
    <Sheet abierta={abierta} titulo="Nuevo evento" onClose={cerrar}>
      {abierta ? <FormularioEvento diaInicial={dia} onListo={cerrar} /> : null}
    </Sheet>
  );
}

interface FormularioEventoProps {
  diaInicial: string;
  onListo(): void;
}

function siguienteHoraEnPunto(): Date {
  const fecha = new Date();
  fecha.setMinutes(0, 0, 0);
  fecha.setHours(fecha.getHours() + 1);
  return fecha;
}

function FormularioEvento({ diaInicial, onListo }: FormularioEventoProps) {
  const comienzo = siguienteHoraEnPunto();
  const [texto, setTexto] = useState('');
  const [dia, setDia] = useState(diaInicial);
  const [inicio, setInicio] = useState(() => horaLocal(comienzo));
  const [fin, setFin] = useState(() => horaLocal(new Date(comienzo.getTime() + 60 * 60_000)));
  const [error, setError] = useState('');

  async function crear(): Promise<void> {
    const limpio = texto.trim();
    if (limpio === '') {
      setError('Poné un nombre para reconocerlo después.');
      return;
    }

    try {
      await nodesRepo.create({
        text: limpio,
        schedule: {
          start: combinarFechaYHora(dia, inicio),
          end: combinarFechaYHora(dia, fin),
          allDay: false,
        },
      });
      onListo();
    } catch (fallo) {
      setError(
        fallo instanceof DomainError
          ? 'La hora de fin tiene que ser posterior a la de inicio.'
          : 'No pudimos crear el evento. Probá de nuevo.',
      );
    }
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        void crear();
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1 text-[length:var(--text-label-md)] text-on-surface-variant">
        ¿Qué vas a hacer?
        <input
          autoFocus
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Reunión de equipo"
          className="min-h-14 rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-4 text-[length:var(--text-body-lg)] text-on-surface outline-none focus-visible:border-primary"
        />
      </label>

      <HorarioFields
        dia={dia}
        inicio={inicio}
        fin={fin}
        onDia={setDia}
        onInicio={setInicio}
        onFin={setFin}
      />

      <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
        Después podés abrirlo y desglosarlo en subtareas.
      </p>

      {error ? (
        <p role="alert" className="text-[length:var(--text-body-sm)] text-accent">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg">
        Crear evento
      </Button>
    </form>
  );
}
