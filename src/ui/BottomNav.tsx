import { NavLink } from 'react-router';
import { useUiStore } from '@/store/uiStore';
import { IconAdd, IconCalendarMonth, IconSettings, IconSparkles, IconViewDay } from './icons';

const ENLACES = [
  { to: '/mes', label: 'Mes', Icon: IconCalendarMonth },
  { to: '/', label: 'Día', Icon: IconViewDay },
  { to: '/canvas', label: 'Ideas', Icon: IconSparkles },
  { to: '/ajustes', label: 'Ajustes', Icon: IconSettings },
];

export function BottomNav() {
  const abrirCaptura = useUiStore((estado) => estado.abrirCaptura);

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-40 flex items-center justify-around border-t border-outline-variant/40 bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {ENLACES.slice(0, 2).map(({ to, label, Icon }) => (
        <NavItem key={to} to={to} label={label} Icon={Icon} />
      ))}

      <button
        type="button"
        onClick={abrirCaptura}
        aria-label="Capturar idea"
        className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform duration-150 active:scale-95"
      >
        <IconAdd />
      </button>

      {ENLACES.slice(2).map(({ to, label, Icon }) => (
        <NavItem key={to} to={to} label={label} Icon={Icon} />
      ))}
    </nav>
  );
}

interface NavItemProps {
  to: string;
  label: string;
  Icon: (props: { size?: number }) => React.ReactElement;
}

function NavItem({ to, label, Icon }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-[length:var(--radius-md)] px-2 transition-colors duration-150 ${
          isActive ? 'text-primary' : 'text-on-surface-variant'
        }`
      }
    >
      <Icon size={22} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}
