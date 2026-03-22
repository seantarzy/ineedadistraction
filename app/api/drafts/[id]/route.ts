import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDraft, updateDraft, deleteDraft } from '@/app/lib/drafts';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  const draft = getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (draft.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(draft);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const draft = getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (draft.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const updates = await req.json();
  return NextResponse.json(updateDraft(id, updates));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const draft = getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (draft.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  deleteDraft(id);
  return NextResponse.json({ ok: true });
}
