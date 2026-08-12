import { useBadges, useStreak } from '@/hooks/useStreak';
import { BadgeGrid } from '@/ui/BadgeGrid';
import { StreakCard } from '@/ui/StreakCard';

export function RewardsView() {
  const racha = useStreak();
  const ganados = useBadges();

  return (
    <section aria-labelledby="titulo-logros" className="flex flex-col gap-5 px-4 py-4">
      <header>
        <h1
          id="titulo-logros"
          className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface"
        >
          Días de Claridad
        </h1>
        <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
          Un día cuenta cuando capturaste algo o cerraste una tarea. Nada más.
        </p>
      </header>

      <StreakCard racha={racha} />

      <div>
        <h2 className="mb-3 text-[length:var(--text-body-lg)] font-semibold text-on-surface">
          Reconocimientos
        </h2>
        <BadgeGrid ganados={ganados} />
      </div>
    </section>
  );
}
