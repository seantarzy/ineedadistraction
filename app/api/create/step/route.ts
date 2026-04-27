import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { compactHtml } from '@/app/lib/htmlCompact';

const client = new Anthropic();

// Per-step generation. Vercel plan caps this: Hobby silently clamps to 60s,
// Pro supports up to 800s. 90s gives Pro users headroom for large games.
export const maxDuration = 90;

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

═══ COMPACTNESS — CRITICAL ═══
The input HTML is COMPACT (whitespace stripped, no comments). Mirror this style in your output:
- No comments anywhere (no //, no /* */, no <!-- -->)
- No newlines between HTML tags
- Single-space delimited where possible (e.g. \`if(x){y()}\` not \`if (x) {\n  y();\n}\`)
- Short variable names in inner loops (i, j, k, x, y, n)
- Keep semicolons but drop unnecessary ones at end of lines
- The full HTML output must close cleanly with </html> and fit comfortably under the token ceiling

Every byte you save reduces the chance of timeout/truncation. Be ruthless.`;

class TruncatedOutputError extends Error {
  constructor() { super('Step output was truncated'); }
}
class OverloadedError extends Error {
  constructor() { super('Anthropic API is overloaded'); }
}
class CreditExhaustedError extends Error {
  constructor() { super('Anthropic API credit balance is too low'); }
}

function isCreditExhausted(err: unknown): boolean {
  const e = err as { status?: number; error?: { error?: { message?: string } }; message?: string };
  if (e?.status !== 400) return false;
  const msg = e?.error?.error?.message || e?.message || '';
  return msg.toLowerCase().includes('credit balance');
}

async function callSonnetWithRetry(userMessage: string) {
  const delays = [500, 1500];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      // Stream under the hood — non-streaming requests with max_tokens this
      // high get rejected by the SDK as potentially exceeding 10 min. The
      // returned Message has the same shape (.content, .stop_reason, .usage).
      return await client.messages
        .stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 24000,
          messages: [{ role: 'user', content: userMessage }],
          system: STEP_SYSTEM_PROMPT,
        })
        .finalMessage();
    } catch (err) {
      lastErr = err;
      if (isCreditExhausted(err)) throw new CreditExhaustedError();
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

  // Compact the HTML — strips comments and collapses whitespace. Saves ~25-35% tokens
  // both in input (cheaper, faster TTFT) and output (Sonnet mirrors compact style).
  const compactedHtml = compactHtml(currentHtml);

  const userMessage = `═══ PLAN ═══
${planSummary || '(no summary)'}

═══ ALL STEPS (→ marks current, ✓ marks already done) ═══
${numbered}

═══ CURRENT STEP TO IMPLEMENT ═══
${currentStep}

═══ CURRENT HTML (compact form — preserve this style in output) ═══
${compactedHtml}

═══ TASK ═══
Modify the HTML above to implement ONLY the current step. Return the complete modified HTML in the same compact form.`;

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
    if (err instanceof CreditExhaustedError) {
      return NextResponse.json({ error: "AI service is temporarily unavailable. The site owner has been notified." }, { status: 503 });
    }
    if (err instanceof OverloadedError) {
      return NextResponse.json({ error: "Anthropic's servers are slammed. Try retrying this step in a moment." }, { status: 503 });
    }
    return NextResponse.json({ error: 'Step generation failed' }, { status: 500 });
  }
}
