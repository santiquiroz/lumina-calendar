import type { Activity, ActivityType, NodeId } from '@/domain/types';
import { ahoraIso, db, nuevoId } from './db';

export function crearActividad(type: ActivityType, nodeId: NodeId): Activity {
  return { id: nuevoId(), type, nodeId, at: ahoraIso() };
}

export const activityRepo = {
  async record(type: ActivityType, nodeId: NodeId): Promise<void> {
    await db.activities.add(crearActividad(type, nodeId));
  },

  listAll(): Promise<Activity[]> {
    return db.activities.toArray();
  },

  clear(): Promise<void> {
    return db.activities.clear();
  },
};
