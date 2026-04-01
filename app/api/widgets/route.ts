import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getWidgets, getWidgetsByUser, addWidget } from '@/app/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter');

  if (filter === 'mine') {
    const { userId } = await auth();
    if (!userId) return NextResponse.json([]);
    return NextResponse.json(getWidgetsByUser(userId));
  }

  return NextResponse.json(getWidgets());
}

export async function POST(req: Request) {
  const { userId } = await auth();
  const body = await req.json();
  const { title, description, emoji, html, author, tags, remixable } = body;

  if (!title || !html) {
    return NextResponse.json({ error: 'title and html are required' }, { status: 400 });
  }

  const widget = addWidget({
    title,
    description: description ?? '',
    emoji: emoji ?? '🎮',
    type: 'user-created',
    html,
    author: author ?? 'Anonymous',
    tags: tags ?? [],
    userId: userId ?? undefined, // attach Clerk user ID if signed in
    remixable: remixable ?? true,
  });

  return NextResponse.json(widget, { status: 201 });
}
