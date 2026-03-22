import crypto from 'crypto';

export type PendingAuth = {
  email: string;
  gameData: {
    title: string;
    description: string;
    emoji: string;
    html: string;
    author: string;
  } | null; // null = sign-in only, no game to publish
  expiresAt: number;
};

const g = global as typeof globalThis & { _authStore?: Map<string, PendingAuth> };
if (!g._authStore) {
  g._authStore = new Map();
}
const store = g._authStore;

export function createPendingAuth(data: Omit<PendingAuth, 'expiresAt'>): string {
  const token = crypto.randomBytes(32).toString('hex');
  store.set(token, { ...data, expiresAt: Date.now() + 1000 * 60 * 60 * 24 });
  return token;
}

export function consumePendingAuth(token: string): PendingAuth | null {
  const pending = store.get(token);
  if (!pending) return null;
  if (pending.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  store.delete(token);
  return pending;
}
