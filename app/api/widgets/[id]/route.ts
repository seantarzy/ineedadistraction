import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteWidget, getWidget, getWidgetForOwner, updateWidget } from '@/app/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Try public read first; if the widget is unpublished, fall through to an
  // owner-scoped read so authors can still load their own games for editing.
  let widget = await getWidget(id);
  if (!widget) {
    const { userId } = await auth();
    if (userId) widget = await getWidgetForOwner(id, userId);
  }
  if (!widget) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(widget);
}

// PATCH — only the widget's original author (matched by Clerk userId) can update.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<{ title: string; description: string; emoji: string; html: string; remixable: boolean; published: boolean }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updated = await updateWidget(id, userId, body);
  if (!updated) {
    // Either the widget doesn't exist or the caller isn't the author.
    return NextResponse.json({ error: 'Not found or not the author' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

// DELETE — hard delete. Used from the dashboard's "Unpublished" section to
// wipe a game permanently after the author has already unpublished it (which
// is the soft-delete via PATCH { published: false }). Vote rows cascade.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ok = await deleteWidget(id, userId);
  if (!ok) return NextResponse.json({ error: 'Not found or not the author' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
