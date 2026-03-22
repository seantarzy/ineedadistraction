export type Draft = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  html: string;
  templateId: string;
  userId: string;
  updatedAt: number;
};

const g = global as typeof globalThis & { _draftStore?: Map<string, Draft> };
if (!g._draftStore) g._draftStore = new Map();
const store = g._draftStore;

export function getDraftsByUser(userId: string): Draft[] {
  return Array.from(store.values())
    .filter((d) => d.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDraft(id: string): Draft | undefined {
  return store.get(id);
}

export function createDraft(draft: Omit<Draft, 'id' | 'updatedAt'>): Draft {
  const id = Math.random().toString(36).slice(2, 9);
  const full: Draft = { ...draft, id, updatedAt: Date.now() };
  store.set(id, full);
  return full;
}

export function updateDraft(id: string, updates: Partial<Omit<Draft, 'id' | 'userId'>>): Draft | null {
  const draft = store.get(id);
  if (!draft) return null;
  const updated = { ...draft, ...updates, updatedAt: Date.now() };
  store.set(id, updated);
  return updated;
}

export function deleteDraft(id: string): boolean {
  return store.delete(id);
}
