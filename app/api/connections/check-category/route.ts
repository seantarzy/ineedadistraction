import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/app/lib/prisma';
import { scoreCategoryGuess, type CategoryDef } from '@/app/lib/connections';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = new Anthropic();

export async function POST(req: Request) {
  let body: { date?: string; categoryIndex?: number; guess?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const date = typeof body.date === 'string' ? body.date : '';
  const idx = typeof body.categoryIndex === 'number' ? body.categoryIndex : -1;
  const guess = typeof body.guess === 'string' ? body.guess : '';
  if (!date || idx < 0 || idx > 3 || !guess.trim()) {
    return NextResponse.json({ error: 'date, categoryIndex, guess required' }, { status: 400 });
  }

  const puzzle = await prisma.dailyPuzzle.findUnique({ where: { date } });
  if (!puzzle) {
    return NextResponse.json({ error: 'No puzzle for that date' }, { status: 404 });
  }

  const cats = puzzle.categories as unknown as CategoryDef[];
  const cat = cats[idx];
  if (!cat) {
    return NextResponse.json({ error: 'Invalid category index' }, { status: 400 });
  }

  const result = await scoreCategoryGuess(guess, cat, client);
  return NextResponse.json(result);
}
