import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { compactHtml, extractHtmlDocument } from '@/app/lib/htmlCompact';

const client = new Anthropic();

// Per-step generation. Vercel plan caps this: Hobby silently clamps to 60s,
// Pro supports up to 800s. 300s = headroom for outlier steps; the typical
// step finishes in 30-90s and the chat retry handles real failures.
export const maxDuration = 300;

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

async function callSonnetWithRetry(stableUserContent: string, dynamicUserContent: string) {
  const delays = [500, 1500];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      // Stream under the hood — non-streaming requests with max_tokens this
      // high get rejected by the SDK as potentially exceeding 10 min. The
      // returned Message has the same shape (.content, .stop_reason, .usage).
      //
      // Caching: the system prompt + the stable user content (plan + steps list)
      // are marked cache_control: ephemeral. Across the steps of one build,
      // these prefixes match, so steps 2..N hit the prompt cache (5-min TTL).
      // Note: caching only triggers if the cached prefix is ≥1024 tokens for
      // Sonnet; smaller prompts silently no-op the cache_control marker.
      return await client.messages
        .stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 24000,
          system: [
            { type: 'text', text: STEP_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: stableUserContent, cache_control: { type: 'ephemeral' } },
              { type: 'text', text: dynamicUserContent },
            ],
          }],
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

  // Compact the HTML — strips comments and collapses whitespace. Saves ~25-35% tokens
  // both in input (cheaper, faster TTFT) and output (Sonnet mirrors compact style).
  const compactedHtml = compactHtml(currentHtml);

  // Split the prompt into stable + dynamic parts so the prompt cache can hit
  // across steps in the same build. Stable = identical for every step of a
  // given plan (plan summary, plain steps list). Dynamic = changes per step
  // (which step we're on + the current HTML).
  const plainSteps = allSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');
  const stableUserContent = `═══ PLAN ═══
${planSummary || '(no summary)'}

═══ ALL STEPS ═══
${plainSteps}

═══ HOW TO READ INPUT ═══
Below this you'll get the current step pointer and the current HTML. Modify the HTML to implement only the current step.`;

  const dynamicUserContent = `═══ CURRENT STEP (${stepIndex + 1} of ${allSteps.length}) ═══
${currentStep}

═══ CURRENT HTML (compact form — preserve this style in output) ═══
${compactedHtml}

═══ TASK ═══
Modify the HTML above to implement ONLY the current step. Return the complete modified HTML in the same compact form.`;

  const startedAt = Date.now();
  try {
    const message = await callSonnetWithRetry(stableUserContent, dynamicUserContent);
    const anthropicMs = Date.now() - startedAt;
    if (message.stop_reason === 'max_tokens') throw new TruncatedOutputError();

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    // Defensive extraction — strips fences, pre-doctype preambles, and post-</html>
    // trailing text. Without this, model reasoning preambles get rendered as
    // visible content inside the iframe.
    let html = extractHtmlDocument(content.text);

    if (!html.trimEnd().toLowerCase().endsWith('</html>')) throw new TruncatedOutputError();
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      return NextResponse.json({ error: 'Step produced invalid HTML' }, { status: 500 });
    }

    // Structured timing log — searchable in Vercel dashboard. cache_read_input_tokens
    // > 0 means the prompt cache hit (steps 2..N within 5 min should hit).
    const usage = message.usage as {
      input_tokens?: number; output_tokens?: number;
      cache_read_input_tokens?: number; cache_creation_input_tokens?: number;
    } | undefined;
    console.log(JSON.stringify({
      event: 'step_done',
      stepIndex,
      stepCount: allSteps.length,
      htmlInBytes: compactedHtml.length,
      htmlOutBytes: html.length,
      anthropicMs,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
      cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage?.cache_creation_input_tokens ?? 0,
    }));

    return NextResponse.json({ html });
  } catch (err) {
    console.error(JSON.stringify({
      event: 'step_failed',
      stepIndex,
      htmlInBytes: compactedHtml.length,
      elapsedMs: Date.now() - startedAt,
      errorName: (err as Error)?.name,
      errorMessage: (err as Error)?.message,
    }));
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
