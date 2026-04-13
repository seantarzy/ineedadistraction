import crypto from 'crypto';
import { prisma } from './prisma';

export type PendingAuth = {
  email: string;
  gameData: {
    title: string;
    description: string;
    emoji: string;
    html: string;
    author: string;
    remixable?: boolean;
  } | null;
  expiresAt: number;
};

export async function createPendingAuth(data: Omit<PendingAuth, 'expiresAt'>): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await prisma.pendingAuth.create({
    data: {
      token,
      email: data.email,
      gameDataJson: data.gameData ? JSON.stringify(data.gameData) : null,
      expiresAt,
    },
  });
  return token;
}

export async function consumePendingAuth(token: string): Promise<PendingAuth | null> {
  const row = await prisma.pendingAuth.findUnique({ where: { token } });
  if (!row) return null;

  // Always delete on consume (single-use token).
  await prisma.pendingAuth.delete({ where: { token } }).catch(() => {});

  if (row.expiresAt.getTime() < Date.now()) return null;

  return {
    email: row.email,
    gameData: row.gameDataJson ? JSON.parse(row.gameDataJson) : null,
    expiresAt: row.expiresAt.getTime(),
  };
}
