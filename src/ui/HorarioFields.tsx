export interface HorarioFieldsProps {
  dia: string;
  inicio: string;
  fin: string;
  onDia(valor: string): void;
  onInicio(valor: string): void;
  onFin(valor: string): void;
}

const CAMPO =
  'min-h-11 rounded-[length:var(--radius-md)] border border-outline-variant bg-surface-lowest px-3 text-on-surface';
const ETIQUETA = 'flex flex-col gap-1 text-[length:var(--text-label-md)] text-on-surface-variant';

export function HorarioFields({
  dia,
  inicio,
  fin,
  onDia,
  onInicio,
  onFin,
}: HorarioFieldsProps) {
  return (
    <>
      <label className={ETIQUETA}>
        Día
        <input type="date" value={dia} onChange={(e) => onDia(e.target.value)} className={CAMPO} />
      </label>

      <div className="flex gap-3">
        <label className={`${ETIQUETA} flex-1`}>
          Empieza
          <input
            type="time"
            value={inicio}
            onChange={(e) => onInicio(e.target.value)}
            className={CAMPO}
          />
        </label>
        <label className={`${ETIQUETA} flex-1`}>
          Termina
          <input type="time" value={fin} onChange={(e) => onFin(e.target.value)} className={CAMPO} />
        </label>
      </div>
    </>
  );
}

export function horaLocal(fecha: Date): string {
  return `${`${fecha.getHours()}`.padStart(2, '0')}:${`${fecha.getMinutes()}`.padStart(2, '0')}`;
}

export function combinarFechaYHora(dia: string, hora: string): string {
  const [anio, mes, numero] = dia.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  return new Date(anio, mes - 1, numero, h, m).toISOString();
}
