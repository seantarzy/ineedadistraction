import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteWidget, getWidget, updateWidget } from '@/app/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const widget = await getWidget(id);
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

  let body: Partial<{ title: string; description: string; emoji: string; html: string; remixable: boolean }>;
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

// DELETE — author unpublishes / takes the game off the market.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ok = await deleteWidget(id, userId);
  if (!ok) return NextResponse.json({ error: 'Not found or not the author' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
