import { TEMPLATES } from './templates';

export type Widget = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  type: 'builtin' | 'user-created';
  html?: string;
  component?: string;
  votes: number;
  createdAt: number;
  author?: string;
  tags?: string[];
  userId?: string; // Clerk user ID — set when created by a signed-in user
  remixable?: boolean; // Whether others can remix this game (default true)
};

const SEED_WIDGETS: Widget[] = [
  {
    id: 'wordle',
    title: 'Wordle',
    description: 'Guess the 5-letter word in 6 tries',
    emoji: '🔤',
    type: 'builtin',
    component: 'Wordle',
    votes: 128,
    createdAt: Date.now() - 86400000 * 7,
    tags: ['word', 'puzzle'],
  },
  {
    id: 'connections',
    title: 'Connections',
    description: 'Find four groups of four related words',
    emoji: '🔗',
    type: 'builtin',
    component: 'Connections',
    votes: 94,
    createdAt: Date.now() - 86400000 * 6,
    tags: ['word', 'puzzle'],
  },
  {
    id: 'brainteaser',
    title: 'Brain Teaser',
    description: 'Challenge your mind with tricky riddles',
    emoji: '🧩',
    type: 'builtin',
    component: 'BrainTeaser',
    votes: 77,
    createdAt: Date.now() - 86400000 * 5,
    tags: ['puzzle', 'riddle'],
  },
  {
    id: 'memory',
    title: 'Memory Game',
    description: 'Match pairs before the clock runs out',
    emoji: '🎴',
    type: 'builtin',
    component: 'MemoryGame',
    votes: 61,
    createdAt: Date.now() - 86400000 * 4,
    tags: ['memory', 'speed'],
  },
  {
    id: 'facts',
    title: 'Random Facts',
    description: 'Discover fascinating facts you never knew',
    emoji: '💡',
    type: 'builtin',
    component: 'FactGenerator',
    votes: 45,
    createdAt: Date.now() - 86400000 * 3,
    tags: ['trivia', 'chill'],
  },
];

// Convert templates (except blank) to widgets so they appear in the game grid
const TEMPLATE_WIDGETS: Widget[] = TEMPLATES
  .filter((t) => t.id !== 'blank')
  .map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    emoji: t.emoji,
    type: 'builtin' as const,
    html: t.html,
    votes: 50,
    createdAt: Date.now() - 86400000 * 3,
    tags: [],
    remixable: true,
  }));

// In-memory store — persists across hot reloads in dev
const g = global as typeof globalThis & { _widgetStore?: Map<string, Widget> };
if (!g._widgetStore) {
  g._widgetStore = new Map([...SEED_WIDGETS, ...TEMPLATE_WIDGETS].map((w) => [w.id, w]));
}
const store = g._widgetStore;

export function getWidgets(): Widget[] {
  return Array.from(store.values()).sort((a, b) => b.votes - a.votes);
}

export function getWidgetsByUser(userId: string): Widget[] {
  return Array.from(store.values())
    .filter((w) => w.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getWidget(id: string): Widget | undefined {
  return store.get(id);
}

export function addWidget(widget: Omit<Widget, 'id' | 'votes' | 'createdAt'>): Widget {
  const id = Math.random().toString(36).slice(2, 9);
  const full: Widget = { ...widget, id, votes: 0, createdAt: Date.now(), remixable: widget.remixable ?? true };
  store.set(id, full);
  return full;
}

export function voteWidget(id: string): Widget | null {
  const widget = store.get(id);
  if (!widget) return null;
  widget.votes += 1;
  return widget;
}

export function unvoteWidget(id: string): Widget | null {
  const widget = store.get(id);
  if (!widget) return null;
  widget.votes = Math.max(0, widget.votes - 1);
  return widget;
}
