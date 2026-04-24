import { prisma } from './prisma';
import type { Draft as PrismaDraft } from '@prisma/client';

export type Draft = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  html: string;
  templateId: string;
  userId: string | null;
  clientId: string | null;
  updatedAt: number;
};

// Identifies the owner of a draft — either a signed-in user or a guest client ID.
export type Owner = { userId: string } | { clientId: string };

function toDraft(row: PrismaDraft): Draft {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    html: row.html,
    templateId: row.templateId,
    userId: row.userId,
    clientId: row.clientId,
    updatedAt: row.updatedAt.getTime(),
  };
}

function ownerWhere(owner: Owner) {
  return 'userId' in owner ? { userId: owner.userId } : { clientId: owner.clientId };
}

export async function getDraftsByOwner(owner: Owner): Promise<Draft[]> {
  const rows = await prisma.draft.findMany({
    where: ownerWhere(owner),
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(toDraft);
}

export async function getDraft(id: string): Promise<Draft | undefined> {
  const row = await prisma.draft.findUnique({ where: { id } });
  return row ? toDraft(row) : undefined;
}

export async function createDraft(
  draft: Omit<Draft, 'id' | 'updatedAt' | 'userId' | 'clientId'>,
  owner: Owner
): Promise<Draft> {
  const row = await prisma.draft.create({
    data: {
      title: draft.title,
      description: draft.description,
      emoji: draft.emoji,
      html: draft.html,
      templateId: draft.templateId,
      userId: 'userId' in owner ? owner.userId : null,
      clientId: 'clientId' in owner ? owner.clientId : null,
    },
  });
  return toDraft(row);
}

export async function updateDraft(
  id: string,
  updates: Partial<Omit<Draft, 'id' | 'userId' | 'clientId' | 'updatedAt'>>
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

// Is the requester allowed to read/write this draft?
export function ownsDraft(draft: Draft, owner: Owner): boolean {
  if ('userId' in owner) return draft.userId === owner.userId;
  return draft.clientId === owner.clientId;
}

// Claim all drafts from a guest clientId for a signed-in user.
// Returns the number of drafts claimed.
export async function claimDrafts(clientId: string, userId: string): Promise<number> {
  const result = await prisma.draft.updateMany({
    where: { clientId },
    data: { userId, clientId: null },
  });
  return result.count;
}
