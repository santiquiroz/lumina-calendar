import { describe, expect, it } from 'vitest';
import { buildNode, buildSchedule } from '@/test/factories';
import { BADGES, earnedBadges } from './badges';
import { RACHA_VACIA } from './streak';
import type { Activity } from './types';

function capturas(cantidad: number): Activity[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: `cap${i}`,
    type: 'capture' as const,
    nodeId: `n${i}`,
    at: '2026-08-12T09:00:00.000Z',
  }));
}

describe('earnedBadges', () => {
  it('no otorga nada sin actividad', () => {
    expect(earnedBadges({ activities: [], nodes: [], streak: RACHA_VACIA })).toEqual([]);
  });

  it('otorga primer-cierre con una tarea completada', () => {
    const completada: Activity = {
      id: 'x',
      type: 'complete',
      nodeId: 'n',
      at: '2026-08-12T09:00:00.000Z',
    };
    expect(earnedBadges({ activities: [completada], nodes: [], streak: RACHA_VACIA })).toContain(
      'primer-cierre',
    );
  });

  it('otorga maestro-del-vaciado con cinco capturas', () => {
    expect(earnedBadges({ activities: capturas(5), nodes: [], streak: RACHA_VACIA })).toContain(
      'maestro-del-vaciado',
    );
  });

  it('no otorga maestro-del-vaciado con cuatro capturas', () => {
    expect(earnedBadges({ activities: capturas(4), nodes: [], streak: RACHA_VACIA })).not.toContain(
      'maestro-del-vaciado',
    );
  });

  it('otorga carpeta-completa cuando un evento tiene todas sus subtareas hechas', () => {
    const nodes = [
      buildNode({ id: 'ev', schedule: buildSchedule('2026-08-12T14:00:00.000Z', 60) }),
      buildNode({ id: 's1', parentId: 'ev', done: true }),
      buildNode({ id: 's2', parentId: 'ev', done: true }),
    ];
    expect(earnedBadges({ activities: [], nodes, streak: RACHA_VACIA })).toContain(
      'carpeta-completa',
    );
  });

  it('no otorga carpeta-completa si queda una subtarea pendiente', () => {
    const nodes = [
      buildNode({ id: 'ev', schedule: buildSchedule('2026-08-12T14:00:00.000Z', 60) }),
      buildNode({ id: 's1', parentId: 'ev', done: true }),
      buildNode({ id: 's2', parentId: 'ev', done: false }),
    ];
    expect(earnedBadges({ activities: [], nodes, streak: RACHA_VACIA })).not.toContain(
      'carpeta-completa',
    );
  });

  it('no otorga carpeta-completa a un evento sin subtareas', () => {
    const nodes = [
      buildNode({ id: 'ev', schedule: buildSchedule('2026-08-12T14:00:00.000Z', 60) }),
    ];
    expect(earnedBadges({ activities: [], nodes, streak: RACHA_VACIA })).not.toContain(
      'carpeta-completa',
    );
  });

  it('otorga siete-dias-claros con racha de siete', () => {
    const streak = { current: 7, longest: 7, forgivenessUsed: false };
    expect(earnedBadges({ activities: [], nodes: [], streak })).toContain('siete-dias-claros');
  });

  it('otorga treinta-dias-claros solo al llegar a treinta', () => {
    const casi = { current: 29, longest: 29, forgivenessUsed: false };
    const logrado = { current: 30, longest: 30, forgivenessUsed: false };
    expect(earnedBadges({ activities: [], nodes: [], streak: casi })).not.toContain(
      'treinta-dias-claros',
    );
    expect(earnedBadges({ activities: [], nodes: [], streak: logrado })).toContain(
      'treinta-dias-claros',
    );
  });

  it('define descripciones sin vocabulario de culpa', () => {
    for (const badge of BADGES) {
      expect(badge.descripcion).not.toMatch(/fallast|vencid|atrasad|perdist/i);
    }
  });
});
