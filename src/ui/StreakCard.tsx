import type { StreakResult } from '@/domain/streak';
import { Card } from './Card';
import { IconFlame } from './icons';

export function StreakCard({ racha }: { racha: StreakResult }) {
  const sinRacha = racha.current === 0;

  return (
    <Card elevated className="flex items-center gap-4">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconFlame size={28} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {sinRacha ? (
          <p className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface">
            Tu próxima racha empieza cuando quieras.
          </p>
        ) : (
          <p className="text-[length:var(--text-headline-sm)] font-semibold text-on-surface">
            {racha.current} {racha.current === 1 ? 'día claro' : 'días claros'}
          </p>
        )}

        {racha.forgivenessUsed ? (
          <p className="text-[length:var(--text-body-sm)] text-on-surface-variant">
            Te tomaste un día libre. La racha sigue.
          </p>
        ) : null}

        {racha.longest > racha.current ? (
          <p className="text-[length:var(--text-label-sm)] text-on-surface-variant">
            Tu récord: {racha.longest} días
          </p>
        ) : null}
      </div>
    </Card>
  );
}
