import { NextResponse } from 'next/server';
import { consumePendingAuth } from '@/app/lib/authStore';
import { addWidget } from '@/app/lib/store';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${BASE_URL}/?error=missing_token`);
  }

  const pending = consumePendingAuth(token);

  if (!pending) {
    return NextResponse.redirect(`${BASE_URL}/?error=invalid_token`);
  }

  // Sign-in only — no game to publish, just welcome them
  if (!pending.gameData) {
    return NextResponse.redirect(`${BASE_URL}/?welcome=1`);
  }

  // Publish the game and send them to it
  const widget = addWidget({
    title: pending.gameData.title,
    description: pending.gameData.description,
    emoji: pending.gameData.emoji ?? '🎮',
    type: 'user-created',
    html: pending.gameData.html,
    author: pending.gameData.author || pending.email.split('@')[0],
    tags: [],
    remixable: pending.gameData.remixable ?? true,
  });

  return NextResponse.redirect(`${BASE_URL}/play/${widget.id}?new=1`);
}
