import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { todayUtc, type CategoryDef } from '@/app/lib/connections';

export const dynamic = 'force-dynamic';

// Deterministic shuffle keyed by date so every player sees the same arrangement
// (same as Wordle / Connections — the "puzzle of the day" is identical for all).
function seedShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 9301 + 49297) % 233280;
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function GET() {
  const date = todayUtc();
  const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date } });
  if (!puzzle) {
    return NextResponse.json({ error: 'No puzzle for today yet — try again shortly.' }, { status: 404 });
  }

  const categories = puzzle.categories as unknown as CategoryDef[];
  const allWords = categories.flatMap((c) => c.words);
  const shuffled = seedShuffle(allWords, date);

  return NextResponse.json({
    date,
    words: shuffled,
    totalCategories: categories.length,
  });
}
