import { NextResponse } from 'next/server';
import { getDraft, updateDraft, deleteDraft, ownsDraft } from '@/app/lib/drafts';
import { resolveOwner } from '@/app/lib/owner';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await resolveOwner(req);
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!owner || !ownsDraft(draft, owner)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(draft);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await resolveOwner(req);
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!ownsDraft(draft, owner)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const updates = await req.json();
  return NextResponse.json(await updateDraft(id, updates));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await resolveOwner(req);
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!ownsDraft(draft, owner)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await deleteDraft(id);
  return NextResponse.json({ ok: true });
}
