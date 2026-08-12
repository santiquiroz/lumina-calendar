export type NodeId = string;

export type EventColorKey = 'indigo' | 'teal' | 'rose' | 'amber' | 'slate';

export const EVENT_COLOR_KEYS: EventColorKey[] = ['indigo', 'teal', 'rose', 'amber', 'slate'];

export interface Schedule {
  start: string;
  end: string;
  allDay: boolean;
}

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  until: string | null;
}

export interface LuminaNode {
  id: NodeId;
  parentId: NodeId | null;
  text: string;
  done: boolean;
  order: string;
  collapsed: boolean;
  schedule: Schedule | null;
  tags: string[];
  colorKey: EventColorKey | null;
  recurrence: Recurrence | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

export type ActivityType = 'capture' | 'complete' | 'schedule';

export interface Activity {
  id: string;
  type: ActivityType;
  nodeId: NodeId;
  at: string;
}
