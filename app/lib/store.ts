import { prisma } from './prisma';
import type { Widget as PrismaWidget } from '@prisma/client';

// Public Widget type — matches what the rest of the app already expects
// (createdAt as a number for backward compat with existing client code).
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
  userId?: string;
  remixable?: boolean;
};

function toWidget(row: PrismaWidget): Widget {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    type: row.type as 'builtin' | 'user-created',
    html: row.html ?? undefined,
    component: row.component ?? undefined,
    votes: row.votes,
    createdAt: row.createdAt.getTime(),
    author: row.author ?? undefined,
    tags: row.tags,
    userId: row.userId ?? undefined,
    remixable: row.remixable,
  };
}

export async function getWidgets(): Promise<Widget[]> {
  const rows = await prisma.widget.findMany({ orderBy: { votes: 'desc' } });
  return rows.map(toWidget);
}

export async function getWidgetsByUser(userId: string): Promise<Widget[]> {
  const rows = await prisma.widget.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toWidget);
}

export async function getWidget(id: string): Promise<Widget | undefined> {
  const row = await prisma.widget.findUnique({ where: { id } });
  return row ? toWidget(row) : undefined;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export async function addWidget(
  widget: Omit<Widget, 'id' | 'votes' | 'createdAt'>
): Promise<Widget> {
  const row = await prisma.widget.create({
    data: {
      id: generateId(),
      title: widget.title,
      description: widget.description,
      emoji: widget.emoji,
      type: widget.type,
      html: widget.html,
      component: widget.component,
      author: widget.author,
      tags: widget.tags ?? [],
      userId: widget.userId,
      remixable: widget.remixable ?? true,
    },
  });
  return toWidget(row);
}

/**
 * Update a widget. Only the original author can update — pass their Clerk
 * userId; if it doesn't match the stored userId, returns null without touching
 * the row. Allowed fields: title, description, emoji, html, remixable.
 */
export async function updateWidget(
  id: string,
  authorClerkUserId: string,
  updates: { title?: string; description?: string; emoji?: string; html?: string; remixable?: boolean },
): Promise<Widget | null> {
  const existing = await prisma.widget.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.userId !== authorClerkUserId) return null;
  const row = await prisma.widget.update({
    where: { id },
    data: {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.emoji !== undefined && { emoji: updates.emoji }),
      ...(updates.html !== undefined && { html: updates.html }),
      ...(updates.remixable !== undefined && { remixable: updates.remixable }),
    },
  });
  return toWidget(row);
}

// Author-only delete — used to "unpublish" a game. Vote rows cascade via Prisma.
export async function deleteWidget(id: string, authorClerkUserId: string): Promise<boolean> {
  const existing = await prisma.widget.findUnique({ where: { id } });
  if (!existing) return false;
  if (existing.userId !== authorClerkUserId) return false;
  await prisma.widget.delete({ where: { id } });
  return true;
}

export async function voteWidget(id: string, voterId: string): Promise<Widget | null> {
  // Idempotent: only count the vote if this voter hasn't already voted.
  try {
    await prisma.vote.create({ data: { widgetId: id, voterId } });
  } catch {
    // Unique constraint violation = already voted; treat as no-op.
    const existing = await prisma.widget.findUnique({ where: { id } });
    return existing ? toWidget(existing) : null;
  }
  const row = await prisma.widget.update({
    where: { id },
    data: { votes: { increment: 1 } },
  });
  return toWidget(row);
}

export async function unvoteWidget(id: string, voterId: string): Promise<Widget | null> {
  const deleted = await prisma.vote.deleteMany({ where: { widgetId: id, voterId } });
  if (deleted.count === 0) {
    const existing = await prisma.widget.findUnique({ where: { id } });
    return existing ? toWidget(existing) : null;
  }
  const row = await prisma.widget.update({
    where: { id },
    data: { votes: { decrement: 1 } },
  });
  // Clamp at zero in case of any drift.
  if (row.votes < 0) {
    const fixed = await prisma.widget.update({ where: { id }, data: { votes: 0 } });
    return toWidget(fixed);
  }
  return toWidget(row);
}
