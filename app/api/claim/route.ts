import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { claimDrafts } from '@/app/lib/drafts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId } = await req.json();
  if (!clientId || typeof clientId !== 'string') {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  }

  const claimed = await claimDrafts(clientId, userId);
  return NextResponse.json({ claimed });
}
