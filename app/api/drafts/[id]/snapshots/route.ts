import { NextResponse } from 'next/server';
import { getDraft, ownsDraft } from '@/app/lib/drafts';
import { createSnapshot } from '@/app/lib/snapshots';
import { resolveOwner } from '@/app/lib/owner';

export const dynamic = 'force-dynamic';

// Create a new snapshot for a draft (called by the orchestrator after a successful build).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await resolveOwner(req);
  const draft = await getDraft(id);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!owner || !ownsDraft(draft, owner)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { version, html } = await req.json();
  if (typeof version !== 'number' || !html || typeof html !== 'string') {
    return NextResponse.json({ error: 'version (number) and html (string) required' }, { status: 400 });
  }

  const snapshot = await createSnapshot(id, version, html);
  return NextResponse.json(snapshot, { status: 201 });
}
