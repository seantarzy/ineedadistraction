import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDraftsByUser, createDraft } from '@/app/lib/drafts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json([]);
  return NextResponse.json(getDraftsByUser(userId));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title, description, emoji, html, templateId } = await req.json();
  if (!html || !templateId) {
    return NextResponse.json({ error: 'html and templateId required' }, { status: 400 });
  }
  const draft = createDraft({
    title: title || 'Untitled Draft',
    description: description || '',
    emoji: emoji || '🎮',
    html,
    templateId,
    userId,
  });
  return NextResponse.json(draft, { status: 201 });
}
