import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/app/lib/prisma';
import { validatePuzzle, todayUtc, type CategoryDef } from '@/app/lib/connections';

export const runtime = 'nodejs';
export const maxDuration = 90;

const client = new Anthropic();

const GENERATOR_PROMPT = `You are designing a daily puzzle for a "Connections-with-naming" game.

Produce exactly 16 unique single-word or two-word entries, grouped into 4 themed categories of 4 words each.

DESIGN RULES:
- Each category has a clear, specific theme that a player could name in 1–4 words.
- Words within a category should fit the theme cleanly. No ambiguous fits.
- Avoid theme overlap — a word should belong to exactly one category.
- Mix difficulty: include one easy category (everyday concept) and one harder/cleverer category (wordplay, double meanings, less obvious link).
- All words common-knowledge — no obscure trivia.
- Family-friendly. No proper nouns of living people. No NSFW.

For each category, also generate 10–15 "acceptable" alternate phrasings — synonyms, rewordings, broader-but-still-correct labels — that a player might reasonably type to mean the same theme.
Example: canonical "Sea creatures" → acceptable: ["sea animals", "marine life", "ocean creatures", "underwater animals", "aquatic animals", "fish and ocean life", "things in the sea", ...]

Return ONLY JSON matching this exact schema:
{
  "categories": [
    {
      "name": "<canonical category label, 1-4 words>",
      "acceptable": ["<alt phrasing 1>", "<alt 2>", ... at least 10],
      "words": ["<w1>", "<w2>", "<w3>", "<w4>"]
    },
    { ... 3 more in same shape ... }
  ]
}

No preamble, no commentary, no markdown fences.`;

// Vercel Cron auto-injects `Authorization: Bearer ${CRON_SECRET}` when the env
// var is set. Manual triggers (curl/backfill) send the same header themselves.
function isAuthorized(request: Request): boolean {
  if (!process.env.CRON_SECRET) return false;
  return request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow forcing regeneration via ?force=1 (idempotent otherwise).
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';
  const dateOverride = url.searchParams.get('date'); // YYYY-MM-DD for backfilling

  const date = dateOverride || todayUtc();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date — use YYYY-MM-DD' }, { status: 400 });
  }

  if (!force) {
    const existing = await prisma.dailyPuzzle.findUnique({ where: { date } });
    if (existing) {
      return NextResponse.json({ status: 'already_exists', date, id: existing.id });
    }
  }

  // One LLM call. Streaming to dodge the SDK's 10-min ceiling on long max_tokens.
  let raw: string;
  try {
    const message = await client.messages
      .stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: GENERATOR_PROMPT }],
      })
      .finalMessage();

    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'Generator output truncated' }, { status: 502 });
    }
    const part = message.content[0];
    if (part.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 502 });
    }
    raw = part.text;
  } catch (err) {
    console.error('Generator API call failed:', err);
    return NextResponse.json({ error: 'Generator API failed' }, { status: 502 });
  }

  // Pull the JSON object out — defensive against preambles.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json({ error: 'No JSON in generator output', raw: raw.slice(0, 400) }, { status: 502 });
  }

  let parsed: { categories: CategoryDef[] };
  try {
    parsed = JSON.parse(match[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Generator output not valid JSON', detail: (err as Error).message }, { status: 502 });
  }

  const validationError = validatePuzzle(parsed);
  if (validationError) {
    return NextResponse.json({ error: 'Generator output failed validation', detail: validationError }, { status: 502 });
  }

  // Upsert (force=1 lets us regenerate; default cron run is idempotent).
  const saved = await prisma.dailyPuzzle.upsert({
    where: { date },
    create: { date, categories: parsed.categories as object },
    update: { categories: parsed.categories as object },
  });

  return NextResponse.json({
    status: force ? 'regenerated' : 'created',
    date,
    id: saved.id,
    categoriesPreview: parsed.categories.map((c) => ({
      name: c.name,
      words: c.words,
      acceptableCount: c.acceptable.length,
    })),
  });
}
