import { NavLink } from 'react-router';
import { useStreak } from '@/hooks/useStreak';
import { useUiStore } from '@/store/uiStore';
import { Button } from './Button';
import {
  IconAdd,
  IconAgenda,
  IconAward,
  IconCalendarMonth,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconViewDay,
} from './icons';

const ENLACES = [
  { to: '/', label: 'Día', Icon: IconViewDay, end: true },
  { to: '/mes', label: 'Mes', Icon: IconCalendarMonth, end: false },
  { to: '/agenda', label: 'Agenda', Icon: IconAgenda, end: false },
  { to: '/canvas', label: 'Idea Canvas', Icon: IconSparkles, end: false },
  { to: '/buscar', label: 'Buscar', Icon: IconSearch, end: false },
  { to: '/logros', label: 'Logros', Icon: IconAward, end: false },
  { to: '/ajustes', label: 'Ajustes', Icon: IconSettings, end: false },
];

export function Sidebar() {
  const abrirCaptura = useUiStore((estado) => estado.abrirCaptura);
  const racha = useStreak();

  return (
    <nav
      aria-label="Navegación principal"
      className="hidden h-full w-[280px] shrink-0 flex-col gap-4 border-r border-outline-variant/40 bg-surface px-4 py-6 md:flex"
    >
      <div className="px-3">
        <p className="text-[length:var(--text-headline-sm)] font-bold tracking-tight text-primary">
          Lumina
        </p>
        <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
          {racha.current > 0
            ? `${racha.current} ${racha.current === 1 ? 'día claro' : 'días claros'}`
            : 'Tu espacio tranquilo'}
        </p>
      </div>

      <Button onClick={abrirCaptura} className="mx-1">
        <IconAdd size={20} />
        Capturar idea
      </Button>

      <ul className="flex flex-col gap-1">
        {ENLACES.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-[length:var(--radius-md)] px-3 transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[length:var(--text-body-sm)]">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
