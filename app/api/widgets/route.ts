import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getWidgets, getWidgetsByUser, addWidget } from '@/app/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter');

    if (filter === 'mine') {
      const { userId } = await auth();
      if (!userId) return NextResponse.json([]);
      return NextResponse.json(await getWidgetsByUser(userId));
    }

    return NextResponse.json(await getWidgets());
  } catch (error) {
    console.error('[api/widgets] GET failed', error);
    return NextResponse.json({ error: 'Failed to load widgets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { title, description, emoji, html, author, tags, remixable, parentId } = body;

    if (!title || !html) {
      return NextResponse.json({ error: 'title and html are required' }, { status: 400 });
    }

    const widget = await addWidget({
      title,
      description: description ?? '',
      emoji: emoji ?? '🎮',
      type: 'user-created',
      html,
      author: author ?? 'Anonymous',
      tags: tags ?? [],
      userId: userId ?? undefined, // attach Clerk user ID if signed in
      remixable: remixable ?? true,
      parentId: typeof parentId === 'string' ? parentId : undefined,
    });

    return NextResponse.json(widget, { status: 201 });
  } catch (error) {
    console.error('[api/widgets] POST failed', error);
    return NextResponse.json({ error: 'Failed to create widget' }, { status: 500 });
  }
}
