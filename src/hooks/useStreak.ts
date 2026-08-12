import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/data/db';
import { earnedBadges } from '@/domain/badges';
import { clarityStreak, RACHA_VACIA, type StreakResult } from '@/domain/streak';
import type { Activity } from '@/domain/types';
import { useAllNodes } from './useNodes';

const SIN_ACTIVIDAD: Activity[] = [];

export function useActivities(): Activity[] {
  return useLiveQuery(() => db.activities.toArray(), [], SIN_ACTIVIDAD);
}

export function useStreak(): StreakResult {
  const activities = useActivities();
  return useMemo(
    () => (activities.length === 0 ? RACHA_VACIA : clarityStreak(activities, new Date())),
    [activities],
  );
}

export function useBadges(): string[] {
  const activities = useActivities();
  const nodes = useAllNodes();
  const streak = useStreak();
  return useMemo(
    () => earnedBadges({ activities, nodes, streak }),
    [activities, nodes, streak],
  );
}
