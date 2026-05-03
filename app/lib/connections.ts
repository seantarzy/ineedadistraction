// Core logic for the Connections-with-naming hero game.
// Two-tier scoring:
//   Tier 1 — local string match against canonical + acceptable phrasings (free, instant)
//   Tier 2 — LLM judge fallback when Tier 1 misses (~$0.001, ~800ms)
import Anthropic from '@anthropic-ai/sdk';

export interface CategoryDef {
  /** The canonical category label revealed to the user. */
  name: string;
  /** LLM-generated acceptable phrasings, used for Tier 1 matching. */
  acceptable: string[];
  /** The 4 words that belong to this category. */
  words: string[];
}

export interface PuzzleData {
  date: string;
  categories: CategoryDef[]; // length 4
}

export interface CategoryScoreResult {
  /** 0-100 — 100 = exact/list, 70-99 = judge close, <70 = judge no. */
  score: number;
  /** The canonical name (so the UI can reveal it). */
  canonical: string;
  /** Where the score came from — useful for analytics + debugging. */
  tier: 'exact' | 'list' | 'judge' | 'judge_error';
  /** Optional friendly judge note for UI display when fuzzy-matched. */
  judgeNote?: string;
}

/** Lowercase, strip leading/trailing punctuation, collapse internal spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/\s+/g, ' ');
}

/**
 * Tier 1 matcher. Checks the user's guess against the canonical name and the
 * pre-generated acceptable list. Tolerates whitespace + casing only — no
 * fuzzy edit-distance (we want "spelling" to feel like it matters at most a
 * little; the judge handles the loose cases).
 */
export function localMatch(guess: string, category: CategoryDef): 'exact' | 'list' | null {
  const g = normalize(guess);
  if (!g) return null;
  if (g === normalize(category.name)) return 'exact';
  for (const alt of category.acceptable) {
    if (g === normalize(alt)) return 'list';
  }
  return null;
}

/**
 * Tier 2 LLM judge — fired only when Tier 1 misses. Uses haiku-4.5 for speed
 * and cost. Returns 0-100 + a short note. Defensive: any malformed response
 * scores 0 with tier 'judge_error' so callers can decide UX (we surface the
 * canonical anyway so the user isn't trapped).
 */
export async function judgeCategoryGuess(
  guess: string,
  category: CategoryDef,
  client: Anthropic,
): Promise<{ score: number; note: string; ok: boolean }> {
  const prompt = `You are scoring a player's category guess in a word-grouping puzzle.

The four words: ${category.words.join(', ')}
Canonical category: "${category.name}"
Acceptable phrasings the puzzle author already approved: ${category.acceptable.slice(0, 8).join(', ')}
Player's guess: "${guess}"

Score the guess from 0 to 100 based on semantic match to the category:
- 90-100: nearly perfect synonym or rewording
- 70-89: clearly correct in spirit but less precise (e.g. "animals" when the answer is "sea creatures")
- 40-69: partially right, captures part of the idea but misses the specific theme
- 0-39: wrong, misleading, or nonsense

Return ONLY JSON: {"score": <0-100>, "note": "<<= 60 chars, friendly explanation>"}
No preamble, no markdown.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = (response.content[0] as { type: string; text: string })?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { score: 0, note: 'Could not score', ok: false };
    const parsed = JSON.parse(match[0]) as { score?: number; note?: string };
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0;
    const note = typeof parsed.note === 'string' ? parsed.note.slice(0, 80) : '';
    return { score, note, ok: true };
  } catch (err) {
    console.error('judgeCategoryGuess failed:', err);
    return { score: 0, note: '', ok: false };
  }
}

/**
 * Top-level: score a user's category-name guess for a known correct grouping.
 * Tier 1 short-circuits to a 100; Tier 2 fires only on misses.
 */
export async function scoreCategoryGuess(
  guess: string,
  category: CategoryDef,
  client: Anthropic,
): Promise<CategoryScoreResult> {
  const localTier = localMatch(guess, category);
  if (localTier) {
    return { score: 100, canonical: category.name, tier: localTier };
  }
  const j = await judgeCategoryGuess(guess, category, client);
  return {
    score: j.score,
    canonical: category.name,
    tier: j.ok ? 'judge' : 'judge_error',
    judgeNote: j.note || undefined,
  };
}

/**
 * Validate a generator response. Returns null if valid, else a string error.
 * Cheap defensive layer between Claude and the database.
 */
export function validatePuzzle(p: unknown): string | null {
  if (!p || typeof p !== 'object') return 'not an object';
  const cats = (p as { categories?: unknown }).categories;
  if (!Array.isArray(cats) || cats.length !== 4) return 'need exactly 4 categories';

  const allWords = new Set<string>();
  for (let i = 0; i < cats.length; i++) {
    const c = cats[i] as Partial<CategoryDef>;
    if (!c.name || typeof c.name !== 'string') return `category ${i}: missing name`;
    if (!Array.isArray(c.words) || c.words.length !== 4) return `category ${i}: need exactly 4 words`;
    if (!Array.isArray(c.acceptable) || c.acceptable.length < 5) return `category ${i}: need ≥5 acceptable phrasings`;
    for (const w of c.words) {
      if (typeof w !== 'string' || !w.trim()) return `category ${i}: invalid word`;
      const normW = normalize(w);
      if (allWords.has(normW)) return `duplicate word "${w}" across categories`;
      allWords.add(normW);
    }
  }
  if (allWords.size !== 16) return `expected 16 unique words, got ${allWords.size}`;
  return null;
}

/** Today in UTC, YYYY-MM-DD format. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
