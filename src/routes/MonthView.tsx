import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  formatMonthLong,
  parseCalendarDay,
  toCalendarDay,
  type CalendarDay,
} from '@/domain/calendarDay';
import { belongsToMonth, monthGrid, NOMBRES_DIAS } from '@/domain/month';
import { useAllNodes } from '@/hooks/useNodes';
import { useUiStore } from '@/store/uiStore';
import { IconButton } from '@/ui/IconButton';
import { IconChevronRight } from '@/ui/icons';

export function MonthView() {
  const navegar = useNavigate();
  const seleccionarDia = useUiStore((estado) => estado.seleccionarDia);
  const diaActivo = useUiStore((estado) => estado.diaSeleccionado);
  const nodos = useAllNodes();

  const [ancla, setAncla] = useState<CalendarDay>(diaActivo);
  const fecha = parseCalendarDay(ancla);
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();

  const densidad = useMemo(() => {
    const conteo = new Map<CalendarDay, number>();
    for (const nodo of nodos) {
      if (!nodo.schedule || nodo.deletedAt !== null || nodo.parentId !== null) continue;
      const dia = toCalendarDay(nodo.schedule.start);
      conteo.set(dia, (conteo.get(dia) ?? 0) + 1);
    }
    return conteo;
  }, [nodos]);

  const cuadricula = monthGrid(anio, mes);
  const hoy = toCalendarDay(new Date());

  function cambiarMes(delta: number): void {
    const nueva = new Date(anio, mes + delta, 1);
    setAncla(toCalendarDay(nueva));
  }

  function abrirDia(dia: CalendarDay): void {
    seleccionarDia(dia);
    navegar('/');
  }

  return (
    <section aria-labelledby="titulo-mes" className="px-4 py-4">
      <header className="mb-3 flex items-center justify-between">
        <h1
          id="titulo-mes"
          className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface first-letter:uppercase"
        >
          {formatMonthLong(ancla)}
        </h1>
        <div className="flex items-center gap-1">
          <IconButton label="Mes anterior" onClick={() => cambiarMes(-1)}>
            <span className="rotate-180">
              <IconChevronRight size={20} />
            </span>
          </IconButton>
          <IconButton label="Mes siguiente" onClick={() => cambiarMes(1)}>
            <IconChevronRight size={20} />
          </IconButton>
        </div>
      </header>

      <div role="grid" aria-label="Cuadrícula del mes" className="flex flex-col gap-1">
        <div role="row" className="grid grid-cols-7">
          {NOMBRES_DIAS.map((nombre, indice) => (
            <span
              key={`${nombre}-${indice}`}
              role="columnheader"
              className="py-1 text-center text-[length:var(--text-label-sm)] text-on-surface-variant"
            >
              {nombre}
            </span>
          ))}
        </div>

        {cuadricula.map((semana) => (
          <div role="row" key={semana[0]} className="grid grid-cols-7 gap-1">
            {semana.map((dia) => {
              const cantidad = densidad.get(dia) ?? 0;
              const delMes = belongsToMonth(dia, anio, mes);
              const numero = parseCalendarDay(dia).getDate();

              return (
                <button
                  key={dia}
                  role="gridcell"
                  type="button"
                  onClick={() => abrirDia(dia)}
                  aria-label={
                    cantidad === 0
                      ? `${numero}, sin bloques`
                      : `${numero}, ${cantidad} ${cantidad === 1 ? 'bloque' : 'bloques'}`
                  }
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[length:var(--radius-md)] transition-colors duration-150 hover:bg-surface-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    delMes ? 'text-on-surface' : 'text-on-surface-variant/40'
                  } ${dia === hoy ? 'bg-primary/10 font-bold text-primary' : ''}`}
                >
                  <span className="text-[length:var(--text-body-sm)] tabular-nums">{numero}</span>
                  <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                    {Array.from({ length: Math.min(cantidad, 3) }, (_, i) => (
                      <span key={i} className="size-1 rounded-full bg-primary/70" />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
