import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { voteWidget, unvoteWidget } from '@/app/lib/store';

const VOTER_COOKIE = 'inad_voter';

async function getVoterId(): Promise<string> {
  const { userId } = await auth();
  if (userId) return `user:${userId}`;

  const jar = await cookies();
  let anon = jar.get(VOTER_COOKIE)?.value;
  if (!anon) {
    anon = crypto.randomBytes(16).toString('hex');
    jar.set(VOTER_COOKIE, anon, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return `anon:${anon}`;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const voterId = await getVoterId();
  const widget = await voteWidget(id, voterId);
  if (!widget) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(widget);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const voterId = await getVoterId();
  const widget = await unvoteWidget(id, voterId);
  if (!widget) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(widget);
}
