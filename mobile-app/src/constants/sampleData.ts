import { theme } from '@src/constants/theme';
import type { SolaraSnapshot } from '@src/types/solara';

export const sampleSnapshot: SolaraSnapshot = {
  system: {
    id: 'demo-system',
    name: 'Solara',
    description: 'A calm private space for front, members, and notes.',
    accountType: 'system',
  },
  members: [
    {
      id: 'demo-akemi',
      name: 'Akemi',
      pronouns: 'she/her',
      color: theme.memberColors[0],
      role: 'host',
      tags: ['front', 'planner'],
      description: 'Keeps the day anchored and gentle.',
    },
    {
      id: 'demo-luna',
      name: 'Luna',
      pronouns: 'she/they',
      color: theme.memberColors[1],
      role: 'caretaker',
      tags: ['soft', 'notes'],
      description: 'Brings warmth to check-ins.',
    },
    {
      id: 'demo-nova',
      name: 'Nova',
      pronouns: 'they/them',
      color: theme.memberColors[2],
      role: 'protector',
      tags: ['grounding'],
      description: 'Watches the edges and keeps things steady.',
    },
  ],
  currentFront: {
    id: 'demo-front-current',
    memberIds: ['demo-akemi', 'demo-luna'],
    startedAt: new Date(Date.now() - 1000 * 60 * 73).toISOString(),
    endedAt: null,
  },
  frontHistory: [
    {
      id: 'demo-front-current',
      memberIds: ['demo-akemi', 'demo-luna'],
      startedAt: new Date(Date.now() - 1000 * 60 * 73).toISOString(),
      endedAt: null,
    },
    {
      id: 'demo-front-last',
      memberIds: ['demo-nova'],
      startedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      endedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      note: 'Quiet focus block.',
    },
  ],
  notes: [
    {
      id: 'demo-note-1',
      title: 'Evening check-in',
      content: 'Keep the front notes short and kind. The app should feel private before it feels powerful.',
      updatedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    },
    {
      id: 'demo-note-2',
      title: 'Grounding',
      content: 'Water, food, medication, then messages. Small steps count.',
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
  ],
};
