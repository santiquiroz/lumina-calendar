import { isSubtreeComplete, subtreeProgress } from './progress';
import type { StreakResult } from './streak';
import { indexNodes } from './tree';
import type { Activity, LuminaNode } from './types';

export interface BadgeContext {
  activities: Activity[];
  nodes: LuminaNode[];
  streak: StreakResult;
}

export interface BadgeDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  icon: 'check' | 'sparkles' | 'folder-check' | 'flame' | 'award';
  test(ctx: BadgeContext): boolean;
}

function contarPorTipo(activities: Activity[], tipo: Activity['type']): number {
  return activities.filter((a) => a.type === tipo).length;
}

function tieneCarpetaCompleta(nodes: LuminaNode[]): boolean {
  const index = indexNodes(nodes);
  return index
    .roots()
    .filter((n) => n.schedule !== null)
    .some((evento) => isSubtreeComplete(subtreeProgress(index, evento.id)));
}

export const BADGES: BadgeDefinition[] = [
  {
    id: 'primer-cierre',
    nombre: 'Primer cierre',
    descripcion: 'Completaste tu primera tarea.',
    icon: 'check',
    test: (ctx) => contarPorTipo(ctx.activities, 'complete') >= 1,
  },
  {
    id: 'maestro-del-vaciado',
    nombre: 'Maestro del vaciado',
    descripcion: 'Capturaste cinco ideas.',
    icon: 'sparkles',
    test: (ctx) => contarPorTipo(ctx.activities, 'capture') >= 5,
  },
  {
    id: 'carpeta-completa',
    nombre: 'Carpeta completa',
    descripcion: 'Cerraste todas las subtareas de un evento.',
    icon: 'folder-check',
    test: (ctx) => tieneCarpetaCompleta(ctx.nodes),
  },
  {
    id: 'siete-dias-claros',
    nombre: 'Siete días claros',
    descripcion: 'Una semana de claridad seguida.',
    icon: 'flame',
    test: (ctx) => ctx.streak.longest >= 7,
  },
  {
    id: 'treinta-dias-claros',
    nombre: 'Treinta días claros',
    descripcion: 'Un mes de claridad.',
    icon: 'award',
    test: (ctx) => ctx.streak.longest >= 30,
  },
];

export function earnedBadges(ctx: BadgeContext): string[] {
  return BADGES.filter((badge) => badge.test(ctx)).map((badge) => badge.id);
}
