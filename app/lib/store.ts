import { prisma } from './prisma';
import type { Widget as PrismaWidget } from '@prisma/client';
import { TEMPLATES } from './templates';

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
  published?: boolean;
  views: number;
  parentId?: string;
  parent?: {
    id: string;
    title: string;
    emoji: string;
    author?: string;
  };
  remixCount?: number;
};

type WidgetRow = PrismaWidget & {
  parent?: Pick<PrismaWidget, 'id' | 'title' | 'emoji' | 'author'> | null;
  _count?: { remixes: number };
};

type LegacyWidgetRow = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  type: string;
  html: string | null;
  component: string | null;
  votes: number;
  createdAt: Date;
  author: string | null;
  tags: string[];
  userId: string | null;
  remixable: boolean;
  published: boolean;
};

function isWidgetSchemaDriftError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('P2022')
    || message.includes('views')
    || message.includes('parentId')
    || message.includes('WidgetRemixes');
}

function toWidget(row: WidgetRow): Widget {
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
    published: row.published,
    views: row.views,
    parentId: row.parentId ?? undefined,
    parent: row.parent
      ? {
          id: row.parent.id,
          title: row.parent.title,
          emoji: row.parent.emoji,
          author: row.parent.author ?? undefined,
        }
      : undefined,
    remixCount: row._count?.remixes ?? 0,
  };
}

function legacyToWidget(row: LegacyWidgetRow): Widget {
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
    published: row.published,
    views: 0,
    remixCount: 0,
  };
}

const FALLBACK_WIDGETS: Widget[] = [
  {
    id: 'wordle',
    title: 'Word Sprint',
    description: 'Decode the 5-letter word in 6 tries and keep your solving streak sharp',
    emoji: '🔤',
    type: 'builtin',
    component: 'Wordle',
    votes: 128,
    createdAt: Date.now() - 86400000 * 7,
    tags: ['word', 'brain', 'daily'],
    remixable: true,
    published: true,
    views: 0,
    remixCount: 0,
  },
  {
    id: 'connections',
    title: 'Connections',
    description: 'Find four hidden groups of related words and test your pattern-matching brain',
    emoji: '🔗',
    type: 'builtin',
    component: 'Connections',
    votes: 94,
    createdAt: Date.now() - 86400000 * 6,
    tags: ['word', 'pattern', 'daily'],
    remixable: true,
    published: true,
    views: 0,
    remixCount: 0,
  },
  {
    id: 'brainteaser',
    title: 'Daily Brain Teaser',
    description: 'Solve a quick riddle, use a hint if you need one, and keep your mind moving',
    emoji: '🧩',
    type: 'builtin',
    component: 'BrainTeaser',
    votes: 77,
    createdAt: Date.now() - 86400000 * 5,
    tags: ['riddle', 'logic', 'brain'],
    remixable: true,
    published: true,
    views: 0,
    remixCount: 0,
  },
  {
    id: 'memory',
    title: 'Memory Sprint',
    description: 'Match the pairs fast, minimize moves, and chase a better memory run',
    emoji: '🎴',
    type: 'builtin',
    component: 'MemoryGame',
    votes: 61,
    createdAt: Date.now() - 86400000 * 4,
    tags: ['memory', 'speed', 'brain'],
    remixable: true,
    published: true,
    views: 0,
    remixCount: 0,
  },
  {
    id: 'facts',
    title: 'Curiosity Cards',
    description: 'Flip through surprising facts and feed the brainy side of your next break',
    emoji: '💡',
    type: 'builtin',
    component: 'FactGenerator',
    votes: 45,
    createdAt: Date.now() - 86400000 * 3,
    tags: ['trivia', 'curiosity', 'brain'],
    remixable: true,
    published: true,
    views: 0,
    remixCount: 0,
  },
  ...TEMPLATES.filter((t) => t.id !== 'blank').map((t, index) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    emoji: t.emoji,
    type: 'builtin' as const,
    html: t.html,
    votes: 50 - index,
    createdAt: Date.now() - 86400000 * 2,
    tags: ['template', 'brain'],
    remixable: true,
    published: true,
    views: 0,
    remixCount: 0,
  })),
];

// Public list — only shows published widgets. Unpublished games are still in
// the database (vote history, snapshots, chat preserved) but invisible to
// players until the author republishes.
export async function getWidgets(): Promise<Widget[]> {
  try {
    const rows = await prisma.widget.findMany({
      where: { published: true },
      orderBy: { votes: 'desc' },
      include: {
        parent: { select: { id: true, title: true, emoji: true, author: true } },
        _count: { select: { remixes: true } },
      },
    });
    return rows.map(toWidget);
  } catch (error) {
    try {
      if (!isWidgetSchemaDriftError(error)) throw error;
      const rows = await prisma.$queryRaw<LegacyWidgetRow[]>`
        SELECT id, title, description, emoji, type, html, component, votes, "createdAt", author, tags, "userId", remixable, published
        FROM "Widget"
        WHERE published = true
        ORDER BY votes DESC
      `;
      return rows.map(legacyToWidget);
    } catch {
      return FALLBACK_WIDGETS;
    }
  }
}

// Author's own listing — returns BOTH published and unpublished, since the
// dashboard surfaces controls for each state separately.
export async function getWidgetsByUser(userId: string): Promise<Widget[]> {
  try {
    const rows = await prisma.widget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        parent: { select: { id: true, title: true, emoji: true, author: true } },
        _count: { select: { remixes: true } },
      },
    });
    return rows.map(toWidget);
  } catch (error) {
    try {
      if (!isWidgetSchemaDriftError(error)) throw error;
      const rows = await prisma.$queryRaw<LegacyWidgetRow[]>`
        SELECT id, title, description, emoji, type, html, component, votes, "createdAt", author, tags, "userId", remixable, published
        FROM "Widget"
        WHERE "userId" = ${userId}
        ORDER BY "createdAt" DESC
      `;
      return rows.map(legacyToWidget);
    } catch {
      return [];
    }
  }
}

// Single-widget fetch hides unpublished from non-owners (the play page, OG
// image, public API GET all flow through this). Owners read their unpublished
// games via getWidgetsByUser on the dashboard instead.
export async function getWidget(id: string): Promise<Widget | undefined> {
  try {
    const row = await prisma.widget.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, title: true, emoji: true, author: true } },
        _count: { select: { remixes: true } },
      },
    });
    if (!row || !row.published) return undefined;
    return toWidget(row);
  } catch (error) {
    try {
      if (!isWidgetSchemaDriftError(error)) throw error;
      const rows = await prisma.$queryRaw<LegacyWidgetRow[]>`
        SELECT id, title, description, emoji, type, html, component, votes, "createdAt", author, tags, "userId", remixable, published
        FROM "Widget"
        WHERE id = ${id}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row || !row.published) return undefined;
      return legacyToWidget(row);
    } catch {
      return FALLBACK_WIDGETS.find((widget) => widget.id === id);
    }
  }
}

// Owner-scoped fetch — used when the author needs to read their own widget
// regardless of published state (e.g. edit-mode load on the template page).
export async function getWidgetForOwner(id: string, ownerId: string): Promise<Widget | undefined> {
  try {
    const row = await prisma.widget.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, title: true, emoji: true, author: true } },
        _count: { select: { remixes: true } },
      },
    });
    if (!row || row.userId !== ownerId) return undefined;
    return toWidget(row);
  } catch (error) {
    try {
      if (!isWidgetSchemaDriftError(error)) throw error;
      const rows = await prisma.$queryRaw<LegacyWidgetRow[]>`
        SELECT id, title, description, emoji, type, html, component, votes, "createdAt", author, tags, "userId", remixable, published
        FROM "Widget"
        WHERE id = ${id} AND "userId" = ${ownerId}
        LIMIT 1
      `;
      const row = rows[0];
      return row ? legacyToWidget(row) : undefined;
    } catch {
      return undefined;
    }
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export async function addWidget(
  widget: Omit<Widget, 'id' | 'votes' | 'createdAt' | 'views' | 'parent' | 'remixCount'> & { views?: number }
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
      views: widget.views ?? 0,
      parentId: widget.parentId,
    },
    include: {
      parent: { select: { id: true, title: true, emoji: true, author: true } },
      _count: { select: { remixes: true } },
    },
  });
  return toWidget(row);
}

/**
 * Update a widget. Only the original author can update — pass their Clerk
 * userId; if it doesn't match the stored userId, returns null without touching
 * the row. Allowed fields: title, description, emoji, html, remixable, published.
 */
export async function updateWidget(
  id: string,
  authorClerkUserId: string,
  updates: { title?: string; description?: string; emoji?: string; html?: string; remixable?: boolean; published?: boolean },
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
      ...(updates.published !== undefined && { published: updates.published }),
    },
    include: {
      parent: { select: { id: true, title: true, emoji: true, author: true } },
      _count: { select: { remixes: true } },
    },
  });
  return toWidget(row);
}

// Author-only hard delete — used after a game has been unpublished and the
// author wants to wipe it permanently. Vote rows cascade via Prisma.
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

export async function incrementWidgetViews(id: string): Promise<Widget | null> {
  try {
    const row = await prisma.widget.update({
      where: { id },
      data: { views: { increment: 1 } },
      include: {
        parent: { select: { id: true, title: true, emoji: true, author: true } },
        _count: { select: { remixes: true } },
      },
    });
    return toWidget(row);
  } catch (error) {
    if (isWidgetSchemaDriftError(error)) {
      const widget = await getWidget(id);
      return widget ?? null;
    }
    return null;
  }
}
