import { BADGES, type BadgeDefinition } from '@/domain/badges';
import { IconAward, IconCheck, IconFlame, IconFolderCheck, IconSparkles } from './icons';

const ICONOS: Record<BadgeDefinition['icon'], (props: { size?: number }) => React.ReactElement> = {
  check: IconCheck,
  sparkles: IconSparkles,
  'folder-check': IconFolderCheck,
  flame: IconFlame,
  award: IconAward,
};

export function BadgeGrid({ ganados }: { ganados: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BADGES.map((badge) => {
        const logrado = ganados.includes(badge.id);
        const Icono = ICONOS[badge.icon];

        return (
          <li
            key={badge.id}
            className={`flex flex-col items-center gap-2 rounded-[length:var(--radius-lg)] px-3 py-4 text-center transition-opacity ${
              logrado ? 'bg-primary/10 text-on-surface' : 'bg-surface-low text-on-surface-variant opacity-60'
            }`}
          >
            <span className={logrado ? 'text-primary' : 'text-outline'}>
              <Icono size={28} />
            </span>
            <span className="text-[length:var(--text-label-md)] font-semibold">{badge.nombre}</span>
            <span className="text-[length:var(--text-label-sm)]">{badge.descripcion}</span>
          </li>
        );
      })}
    </ul>
  );
}
