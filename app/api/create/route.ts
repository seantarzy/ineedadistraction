import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior browser game developer for "I Need a Distraction" — a platform for quick, delightful mini-games that run entirely in the browser.

Your job is to produce a COMPLETE, WORKING, self-contained HTML game. Every mechanic must be fully implemented and every interaction must respond correctly. Think of yourself as shipping a finished product, not a prototype.

═══ OUTPUT FORMAT ═══
Return ONLY a valid HTML document. No markdown, no code fences, no explanations.
Start with <!DOCTYPE html> and end with </html>.

═══ HARD CONSTRAINTS ═══
• No external scripts or stylesheets — everything inline
• No fetch(), XMLHttpRequest, WebSocket, or any network calls
• No localStorage, sessionStorage, or cookies
• Must run inside: <iframe sandbox="allow-scripts" srcdoc="...">
• CSS @import for Google Fonts is allowed (it's a stylesheet, not a script)

═══ BEFORE YOU OUTPUT — SELF-REVIEW CHECKLIST ═══
Go through this checklist mentally before writing a single character of output:
□ Every button has a click event listener wired up in JavaScript
□ The game loop / main interaction actually starts when player clicks Start
□ Score, timer, lives, and other state update visibly in real time
□ Game over / win state is clearly shown with a restart option
□ Every DOM element ID used in JS exists in the HTML
□ No undefined variables or functions that are called but never defined
□ If it's a canvas game: ctx.clearRect is called each frame
□ If it's a DOM game: state changes actually update visible text/styles

═══ VISUAL REQUIREMENTS ═══
• Dark or vibrant background — avoid plain white pages
• Large readable text: 16px minimum body, 24px+ for score/timer
• Buttons must have visible hover and active states (cursor:pointer, color change)
• Tap targets 44px minimum height for mobile
• Show the game title prominently at the top

═══ WHAT YOU CAN BUILD ═══
✓ Arcade games: snake, breakout, flappy, dodge, pong-vs-AI
✓ Speed/reflex: click targets, reaction timer, tap rhythm
✓ Puzzle: sliding tiles, match-3, nonogram, sudoku (small grid)
✓ Quiz/trivia: multiple choice, type-in-answer, true/false
✓ Word games: scramble, hangman, word search, typing speed
✓ Math games: speed arithmetic, number puzzles
✓ Clicker/idle: upgrade loops, resource management
✓ Card games: memory flip, simple solitaire
✓ Mini-RPG: turn-based combat vs AI, no server needed
✓ Driving/avoidance: dodge obstacles, simple physics

═══ OUT OF SCOPE — build closest in-scope alternative instead ═══
✗ Real-time multiplayer (no WebSockets, no shared server state)
✗ Games requiring camera, microphone, or file system
✗ Persistent world / MMORPG
✗ External API data (no live sports scores, no external trivia APIs)

═══ REMIX RULES (when given existing game HTML) ═══
1. Keep ALL original mechanics working: scoring, timer, win/lose, controls
2. ADD the requested twist — do not replace or remove existing mechanics
3. Visual elements like characters/monsters MUST react to game events (move, animate, change color)
4. The result should feel like the original game PLUS something new`;

// ─── Validation prompt ────────────────────────────────────────────────────────
const VALIDATION_PROMPT = `You are a QA engineer reviewing an HTML browser game for critical bugs.

Analyze the HTML/JS and check ONLY these four things:
1. Do all visible buttons have JavaScript click event listeners?
2. Does the main game start / loop activate when the player interacts (clicks Start, etc.)?
3. Are all DOM element IDs referenced in JavaScript also present in the HTML?
4. For canvas games: is ctx.clearRect (or equivalent) called in the game loop?

Return ONLY valid JSON — no explanation:
{"valid": true}
or
{"valid": false, "issues": ["specific issue 1", "specific issue 2"]}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function generateGame(userMessage: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: userMessage }],
    system: SYSTEM_PROMPT,
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  let html = content.text.trim();
  const fenced = html.match(/```(?:html)?\n?([\s\S]*?)```/);
  if (fenced) html = fenced[1].trim();

  return html;
}

async function extractMeta(html: string): Promise<{ title: string; description: string }> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'You extract metadata from browser games. Return ONLY valid JSON, no explanation.',
      messages: [{
        role: 'user',
        content: `Read this browser game's HTML and return:
{"title": "short catchy game name (3-5 words max)", "description": "2-3 sentence how-to-play. Start with the goal, then describe the main action, then mention any win/lose condition."}

HTML (first 4000 chars):
${html.slice(0, 4000)}`,
      }],
    });
    const text = (message.content[0] as { type: string; text: string }).text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    const parsed = JSON.parse(match[0]);
    return {
      title: typeof parsed.title === 'string' ? parsed.title.slice(0, 60) : '',
      description: typeof parsed.description === 'string' ? parsed.description.slice(0, 300) : '',
    };
  } catch {
    return { title: '', description: '' };
  }
}

async function validateGame(html: string): Promise<string[]> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // fast + cheap for validation
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `${html.slice(0, 6000)}\n\n---\nReview the game above for the four checks and return JSON only.`,
      }],
      system: VALIDATION_PROMPT,
    });

    const text = (message.content[0] as { type: string; text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const result = JSON.parse(jsonMatch[0]);
    if (result.valid === false && Array.isArray(result.issues)) {
      return result.issues as string[];
    }
    return [];
  } catch {
    return []; // validation failure → assume valid, don't block the user
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const { prompt, baseHtml } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const userMessage = baseHtml
    ? `Here is an existing browser game (complete HTML/CSS/JS):\n\n${baseHtml}\n\n---\n\nRemix this game by adding the following twist while keeping ALL original mechanics intact:\n\n${prompt}\n\nReturn the complete modified HTML document.`
    : `Create a browser game: ${prompt}`;

  try {
    // ── First attempt ─────────────────────────────────────────────────────────
    let html = await generateGame(userMessage);

    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      return NextResponse.json({ error: 'Generation produced invalid output, please try again' }, { status: 500 });
    }

    // ── Validate ──────────────────────────────────────────────────────────────
    const issues = await validateGame(html);

    // ── Retry once if bugs found ──────────────────────────────────────────────
    if (issues.length > 0) {
      const retryMessage = `${userMessage}

IMPORTANT: A previous generation attempt had these bugs — fix all of them:
${issues.map((i) => `• ${i}`).join('\n')}

Generate a corrected, fully working version.`;

      html = await generateGame(retryMessage);
    }

    // ── Extract title + how-to-play (runs in parallel with nothing else, fast) ─
    const meta = await extractMeta(html);

    return NextResponse.json({ html, title: meta.title, description: meta.description });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
