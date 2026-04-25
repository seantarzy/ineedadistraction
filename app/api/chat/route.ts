import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDraft, createDraft, ownsDraft } from '@/app/lib/drafts';
import { getMessages, addMessage } from '@/app/lib/messages';
import { resolveOwner } from '@/app/lib/owner';

export const maxDuration = 30;

const client = new Anthropic();

const SYSTEM = `You are the AI collaborator inside a vibe-coding tool where users remix browser mini-games through conversation.

Each turn, classify your response as one of three kinds and return ONLY JSON:

1. "chat" — for clarifying questions, discussion, suggestions without building yet, acknowledgements.
   {"kind": "chat", "content": "your reply, conversational"}

2. "plan" — when the user wants a complex change (new mechanics, genre shift, or multiple coordinated changes). Propose 3-5 chunky, meaningful player-facing steps and wait for approval. Fewer big steps beats many tiny ones — each step triggers a full code regeneration, so prefer steps that bundle related changes (e.g. "add level system with progression and HUD display" instead of three separate steps).
   {"kind": "plan", "content": "short intro sentence before the plan", "plan": {"summary": "one-sentence description", "steps": ["what the player sees step 1", "step 2", ...]}}

3. "generate" — for simple, clear changes you can ship directly (single tweaks, color/speed changes, swap one element).
   {"kind": "generate", "content": "brief acknowledgement, 1 sentence", "instruction": "precise instruction for the code generator — the distilled change, not the raw user text"}

DECISION RULES:
- Ambiguous request → "chat" with a clarifying question
- Simple, self-contained change → "generate"
- Multi-step or new-mechanic change → "plan"
- User refining a plan you proposed AND asking you to proceed (e.g. "go for it", "ship it", "let's build", "yes but change X") → "generate" with an updated instruction that incorporates their tweaks. Do NOT use "chat" here.
- User refining a plan WITHOUT asking to proceed (just discussing, asking questions) → "chat" or revised "plan"

CRITICAL: If your reply would say things like "Let me build that", "On it", "Shipping now", "I'll get to work", "Building this now" — you MUST use kind "generate", not "chat". Never promise to build something in a chat reply; the chat reply is the only message you'll send this turn. If you're going to build, USE GENERATE.

Be brief. Never dump code. Never explain the HTML. Talk about what the player will experience.`;

type ChatKind = 'chat' | 'plan' | 'generate';
type Plan = { summary: string; steps: string[] };

function parseAssistant(text: string): { kind: ChatKind; content: string; plan?: Plan; instruction?: string } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { kind: 'chat', content: text.slice(0, 500) };
  try {
    const parsed = JSON.parse(match[0]);
    if (parsed.kind === 'plan' && parsed.plan?.summary && Array.isArray(parsed.plan?.steps)) {
      return { kind: 'plan', content: String(parsed.content ?? ''), plan: parsed.plan };
    }
    if (parsed.kind === 'generate' && typeof parsed.instruction === 'string') {
      return { kind: 'generate', content: String(parsed.content ?? ''), instruction: parsed.instruction };
    }
    return { kind: 'chat', content: String(parsed.content ?? text.slice(0, 500)) };
  } catch {
    return { kind: 'chat', content: text.slice(0, 500) };
  }
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const owner = await resolveOwner(req);
  if (!owner) return NextResponse.json({ error: 'No owner identity' }, { status: 401 });

  const { draftId: incomingDraftId, userMessage, currentHtml, templateId, emoji } = await req.json();
  if (!userMessage || typeof userMessage !== 'string') {
    return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
  }

  // Resolve or create the draft so we have somewhere to attach messages.
  let draftId = incomingDraftId;
  if (draftId) {
    const draft = await getDraft(draftId);
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    if (!ownsDraft(draft, owner)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (!templateId || !currentHtml) {
      return NextResponse.json({ error: 'templateId and currentHtml required when no draftId' }, { status: 400 });
    }
    const newDraft = await createDraft(
      { title: 'Untitled Draft', description: '', emoji: emoji || '🎮', html: currentHtml, templateId },
      owner
    );
    draftId = newDraft.id;
  }

  // Build multi-turn message list from persisted history.
  const history = await getMessages(draftId);
  const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.role === 'assistant' && m.kind === 'plan' && m.payload
      ? `${m.content}\n\nPlan:\n${JSON.stringify(m.payload)}`
      : m.content,
  }));

  // Append the new user message with current HTML context (only on the latest turn to save tokens).
  const htmlSnippet = currentHtml ? String(currentHtml).slice(0, 2500) : '';
  messages.push({
    role: 'user',
    content: htmlSnippet
      ? `[Current game HTML, truncated]\n${htmlSnippet}\n\n[My message]\n${userMessage}`
      : userMessage,
  });

  // Persist the user message (store just the raw text, not the HTML context).
  await addMessage({ draftId, role: 'user', kind: 'chat', content: userMessage });

  let parsed: ReturnType<typeof parseAssistant>;
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM,
      messages,
    });
    const text = (response.content[0] as { type: string; text: string }).text;
    parsed = parseAssistant(text);
  } catch (err) {
    console.error(err);
    // Detect Anthropic credit-balance errors and surface them with a friendly message
    const e = err as { status?: number; error?: { error?: { message?: string } }; message?: string };
    const msg = e?.error?.error?.message || e?.message || '';
    if (e?.status === 400 && msg.toLowerCase().includes('credit balance')) {
      return NextResponse.json({ error: "AI service is temporarily unavailable. The site owner has been notified." }, { status: 503 });
    }
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }

  // Persist the assistant reply with its structured payload.
  const assistantMsg = await addMessage({
    draftId,
    role: 'assistant',
    kind: parsed.kind === 'plan' ? 'plan' : 'chat',
    content: parsed.content,
    payload: parsed.kind === 'plan' ? parsed.plan ?? null : null,
  });

  return NextResponse.json({
    draftId,
    message: assistantMsg,
    // Surface the distilled instruction so the client can call /api/create next.
    instruction: parsed.kind === 'generate' ? parsed.instruction : null,
    plan: parsed.kind === 'plan' ? parsed.plan : null,
  });
}
