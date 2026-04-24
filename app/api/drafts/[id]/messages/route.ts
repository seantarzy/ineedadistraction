import { NextResponse } from 'next/server';
import { getDraft, ownsDraft } from '@/app/lib/drafts';
import { getMessages, addMessage } from '@/app/lib/messages';
import { resolveOwner } from '@/app/lib/owner';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await resolveOwner(req);
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!owner || !ownsDraft(draft, owner)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await getMessages(id));
}

// Used by the client to append generate_result messages after /api/create completes.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await resolveOwner(req);
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!owner || !ownsDraft(draft, owner)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { role, kind, content, payload } = await req.json();
  if (!role || !kind || !content) {
    return NextResponse.json({ error: 'role, kind, content required' }, { status: 400 });
  }
  const msg = await addMessage({ draftId: id, role, kind, content, payload });
  return NextResponse.json(msg, { status: 201 });
}
