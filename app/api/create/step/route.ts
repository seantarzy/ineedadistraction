import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Per-step generation: 30s should comfortably fit a single focused HTML edit.
export const maxDuration = 60;

const STEP_SYSTEM_PROMPT = `You are implementing ONE step of an approved gameplan for a browser mini-game.

You will receive:
- The plan summary (what we're building toward overall)
- The full step list (so you have context)
- The CURRENT STEP you must implement
- The current HTML (a working game with prior steps already applied)

Your job: modify the HTML to implement ONLY the current step. Do not implement other steps.

═══ HARD RULES ═══
• Return ONLY the complete modified HTML document — no markdown, no fences, no commentary
• Start with <!DOCTYPE html> and end with </html>
• PRESERVE every existing mechanic, ID, event listener, and game-loop behavior unless the current step explicitly asks you to change it
• Inline everything — no external scripts/stylesheets, no fetch/network calls, no localStorage/cookies
• The full HTML must close cleanly with </html> — never truncate

═══ EDITING DISCIPLINE ═══
• Add the smallest, surgical change needed to satisfy the current step
• Don't refactor unrelated code
• Don't restyle elements not mentioned by the step
• If the step requires new state, integrate it cleanly with existing variables
• If the step requires new UI, place it where it makes sense in the existing layout

═══ COMPACTNESS ═══
Keep code compact — minimal whitespace, no comments, short variable names in hot loops. The output must fit in 16k tokens including the unchanged parts.`;

class TruncatedOutputError extends Error {
  constructor() { super('Step output was truncated'); }
}
class OverloadedError extends Error {
  constructor() { super('Anthropic API is overloaded'); }
}

async function callSonnetWithRetry(userMessage: string) {
  const delays = [500, 1500];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [{ role: 'user', content: userMessage }],
        system: STEP_SYSTEM_PROMPT,
      });
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const retryable = status === 529 || status === 503 || status === 500;
      if (!retryable || attempt === delays.length) break;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  const status = (lastErr as { status?: number })?.status;
  if (status === 529) throw new OverloadedError();
  throw lastErr;
}

export async function POST(req: Request) {
  const { currentHtml, planSummary, allSteps, stepIndex } = await req.json();

  if (!currentHtml || typeof currentHtml !== 'string') {
    return NextResponse.json({ error: 'currentHtml is required' }, { status: 400 });
  }
  if (!Array.isArray(allSteps) || typeof stepIndex !== 'number' || stepIndex < 0 || stepIndex >= allSteps.length) {
    return NextResponse.json({ error: 'allSteps[] and valid stepIndex required' }, { status: 400 });
  }

  const currentStep = allSteps[stepIndex];
  const numbered = allSteps.map((s: string, i: number) => `${i === stepIndex ? '→' : i < stepIndex ? '✓' : ' '} ${i + 1}. ${s}`).join('\n');

  const userMessage = `═══ PLAN ═══
${planSummary || '(no summary)'}

═══ ALL STEPS (→ marks current, ✓ marks already done) ═══
${numbered}

═══ CURRENT STEP TO IMPLEMENT ═══
${currentStep}

═══ CURRENT HTML ═══
${currentHtml}

═══ TASK ═══
Modify the HTML above to implement ONLY the current step. Return the complete modified HTML.`;

  try {
    const message = await callSonnetWithRetry(userMessage);
    if (message.stop_reason === 'max_tokens') throw new TruncatedOutputError();

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    let html = content.text.trim();
    const fenced = html.match(/```(?:html)?\n?([\s\S]*?)```/);
    if (fenced) html = fenced[1].trim();

    if (!html.trimEnd().toLowerCase().endsWith('</html>')) throw new TruncatedOutputError();
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      return NextResponse.json({ error: 'Step produced invalid HTML' }, { status: 500 });
    }

    return NextResponse.json({ html });
  } catch (err) {
    console.error(err);
    if (err instanceof TruncatedOutputError) {
      return NextResponse.json({ error: 'This step produced too much code to fit in one generation. Try splitting it into smaller steps.' }, { status: 500 });
    }
    if (err instanceof OverloadedError) {
      return NextResponse.json({ error: "Anthropic's servers are slammed. Try retrying this step in a moment." }, { status: 503 });
    }
    return NextResponse.json({ error: 'Step generation failed' }, { status: 500 });
  }
}
