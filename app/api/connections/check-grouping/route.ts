import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { normalize, type CategoryDef } from '@/app/lib/connections';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { date?: string; words?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const date = typeof body.date === 'string' ? body.date : '';
  const guess = Array.isArray(body.words) ? body.words.map(String) : [];
  if (!date || guess.length !== 4) {
    return NextResponse.json({ error: 'date + 4 words required' }, { status: 400 });
  }

  const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date } });
  if (!puzzle) {
    return NextResponse.json({ error: 'No puzzle for that date' }, { status: 404 });
  }

  const cats = puzzle.categories as unknown as CategoryDef[];
  const guessSet = new Set(guess.map(normalize));
  if (guessSet.size !== 4) {
    return NextResponse.json({ error: 'Words must be unique' }, { status: 400 });
  }

  let bestOverlap = 0;
  let matchedIndex: number | null = null;
  for (let i = 0; i < cats.length; i++) {
    const catSet = new Set(cats[i].words.map(normalize));
    let overlap = 0;
    for (const w of guessSet) if (catSet.has(w)) overlap++;
    if (overlap === 4) {
      matchedIndex = i;
      bestOverlap = 4;
      break;
    }
    if (overlap > bestOverlap) bestOverlap = overlap;
  }

  if (matchedIndex !== null) {
    return NextResponse.json({
      correct: true,
      categoryIndex: matchedIndex,
      // canonical revealed only AFTER the user names it — keep it suspenseful
    });
  }

  return NextResponse.json({
    correct: false,
    oneAway: bestOverlap === 3,
  });
}
