import { prisma } from './prisma';
import type { Draft as PrismaDraft } from '@prisma/client';

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

function toDraft(row: PrismaDraft): Draft {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    html: row.html,
    templateId: row.templateId,
    userId: row.userId,
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function getDraftsByUser(userId: string): Promise<Draft[]> {
  const rows = await prisma.draft.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(toDraft);
}

export async function getDraft(id: string): Promise<Draft | undefined> {
  const row = await prisma.draft.findUnique({ where: { id } });
  return row ? toDraft(row) : undefined;
}

export async function createDraft(draft: Omit<Draft, 'id' | 'updatedAt'>): Promise<Draft> {
  const row = await prisma.draft.create({
    data: {
      title: draft.title,
      description: draft.description,
      emoji: draft.emoji,
      html: draft.html,
      templateId: draft.templateId,
      userId: draft.userId,
    },
  });
  return toDraft(row);
}

export async function updateDraft(
  id: string,
  updates: Partial<Omit<Draft, 'id' | 'userId' | 'updatedAt'>>
): Promise<Draft | null> {
  try {
    const row = await prisma.draft.update({ where: { id }, data: updates });
    return toDraft(row);
  } catch {
    return null;
  }
}

export async function deleteDraft(id: string): Promise<boolean> {
  try {
    await prisma.draft.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
