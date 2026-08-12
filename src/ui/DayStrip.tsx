import { addDays, parseCalendarDay, toCalendarDay, type CalendarDay } from '@/domain/calendarDay';

const NOMBRES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export interface DayStripProps {
  seleccionado: CalendarDay;
  onSelect(day: CalendarDay): void;
}

export function DayStrip({ seleccionado, onSelect }: DayStripProps) {
  const base = parseCalendarDay(seleccionado);
  const inicioSemana = addDays(seleccionado, -base.getDay());
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));
  const hoy = toCalendarDay(new Date());

  return (
    <div className="flex items-center justify-between gap-1 border-b border-outline-variant/40 px-4 py-2">
      {dias.map((dia, indice) => {
        const activo = dia === seleccionado;
        const numero = parseCalendarDay(dia).getDate();
        return (
          <button
            key={dia}
            type="button"
            onClick={() => onSelect(dia)}
            aria-current={activo ? 'date' : undefined}
            className={`flex min-h-11 w-11 flex-col items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              activo
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface'
            }`}
          >
            <span className="text-[10px] uppercase opacity-80">{NOMBRES[indice]}</span>
            <span
              className={`text-[length:var(--text-body-md)] tabular-nums ${
                dia === hoy && !activo ? 'font-bold text-primary' : ''
              }`}
            >
              {numero}
            </span>
          </button>
        );
      })}
    </div>
  );
}
