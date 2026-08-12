import { DAY_START_HOUR, HOUR_HEIGHT_PX } from './TimelineGrid';

export function NowIndicator({ now }: { now: Date }) {
  const horas = now.getHours() + now.getMinutes() / 60 - DAY_START_HOUR;
  const top = horas * HOUR_HEIGHT_PX;

  return (
    <div
      data-testid="indicador-ahora"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
      style={{ top }}
    >
      <span className="-ml-1.5 size-2.5 rounded-full bg-primary ring-2 ring-surface" />
      <span className="h-px flex-1 bg-primary/50" />
    </div>
  );
}
