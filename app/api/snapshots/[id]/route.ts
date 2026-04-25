import { NextResponse } from 'next/server';
import { getDraft, ownsDraft } from '@/app/lib/drafts';
import { getSnapshot } from '@/app/lib/snapshots';
import { resolveOwner } from '@/app/lib/owner';

export const dynamic = 'force-dynamic';

// Fetch a snapshot's HTML — used when the user reverts to a prior version.
// Ownership is checked via the parent draft.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getSnapshot(id);
  if (!snapshot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const draft = await getDraft(snapshot.draftId);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const owner = await resolveOwner(req);
  if (!owner || !ownsDraft(draft, owner)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(snapshot);
}
