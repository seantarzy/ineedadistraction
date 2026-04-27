'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { getTemplate } from '../../lib/templates';
import { getClientId } from '../../lib/clientId';
import { trackResultGenerated, trackCTAClick, trackError } from '../../lib/analytics';

const CREATED_KEY = 'inad_created_at';
const LIMIT_MS = 24 * 60 * 60 * 1000;

function hasUsedCreation() {
  if (typeof window === 'undefined') return false;
  const ts = localStorage.getItem(CREATED_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < LIMIT_MS;
}
function markCreationUsed() {
  localStorage.setItem(CREATED_KEY, String(Date.now()));
}

// Wire X-Client-Id into every API call from this page so guests can own drafts.
function ownerHeaders(): HeadersInit {
  const cid = getClientId();
  return cid ? { 'x-client-id': cid } : {};
}

// Safely parse a Response body — falls back to a friendly status-derived message
// when the server returns HTML (e.g. Vercel's 504/502 gateway pages, not JSON).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeJson<T = any>(res: Response): Promise<T & { error?: string }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    if (res.status === 504) return { error: 'The generation timed out. Anthropic might be slow — try again in a moment.' } as T & { error?: string };
    if (res.status === 502 || res.status === 503) return { error: 'The server is temporarily unavailable. Try again in a moment.' } as T & { error?: string };
    return { error: `Server returned ${res.status}. Try again.` } as T & { error?: string };
  }
}

type Plan = { summary: string; steps: string[] };
type StepState =
  | { status: 'pending' }
  | { status: 'running'; elapsed: number }
  | { status: 'done'; durationMs?: number }
  | { status: 'failed'; errorMessage?: string };
type GenerateResultPayload = { version: number; snapshotId?: string; stepCount?: number };
type StepResultPayload = {
  planMessageId: string;
  stepIndex: number;
  status: 'done' | 'failed';
  errorMessage?: string;
  durationMs?: number;
};
type CheckpointRevertPayload = { targetVersion: number; snapshotId: string };
type MessagePayload = Plan | GenerateResultPayload | StepResultPayload | CheckpointRevertPayload | null;
type Message = {
  id: string;
  role: 'user' | 'assistant';
  kind: 'chat' | 'plan' | 'generate_result' | 'step_result' | 'checkpoint_revert';
  content: string;
  payload: MessagePayload;
  createdAt: number;
};
type ChatStatus = 'idle' | 'chatting' | 'generating';
type PublishStep = 'idle' | 'sent';

type Source = { title: string; emoji: string; html: string; remixHint: string; id: string };

export default function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const template = getTemplate(id);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const [source, setSource] = useState<Source | null>(
    template ? { title: template.title, emoji: template.emoji, html: template.html, remixHint: template.remixHint, id: template.id } : null
  );
  const [sourceLoading, setSourceLoading] = useState(!template);

  const [currentHtml, setCurrentHtml] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [remixCount, setRemixCount] = useState(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatStatus, setChatStatus] = useState<ChatStatus>('idle');
  // Step-by-step orchestration state — null when no plan is being executed.
  const [executingPlanId, setExecutingPlanId] = useState<string | null>(null);
  const [executingStepIndex, setExecutingStepIndex] = useState<number | null>(null);
  const [stepStartedAt, setStepStartedAt] = useState<number | null>(null);
  const [stepElapsed, setStepElapsed] = useState(0);

  // Queue: while generation is in flight, "Send" stores the message for after the build.
  // Only one slot — keeps UX simple ("just one more thing"). Auto-sent on idle.
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const queueRef = useRef<string | null>(null);
  // Keep ref in sync so async handlers can read the latest queued value
  queueRef.current = queuedMessage;

  // Abort controller for the current in-flight generation
  const abortRef = useRef<AbortController | null>(null);
  const interruptedRef = useRef(false);
  const [chatError, setChatError] = useState('');
  const [blockedByLimit, setBlockedByLimit] = useState(false);

  const draftIdRef = useRef<string | null>(searchParams.get('draft'));
  // Author edit mode: ?edit=1 means publish writes back to the existing widget
  // (PATCH) instead of creating a new remix (POST). Source-loading and the
  // publish form are tweaked accordingly. Server-side enforces author-only.
  const isEditMode = searchParams.get('edit') === '1';
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [genReasoningIdx, setGenReasoningIdx] = useState(0);
  const [genElapsed, setGenElapsed] = useState(0);

  // Publish flow
  const [publishStep, setPublishStep] = useState<PublishStep>('idle');
  const [gameTitle, setGameTitle] = useState('');
  const [howToPlay, setHowToPlay] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [allowRemixes, setAllowRemixes] = useState(true);

  // Fetch source (widget) if not a builtin template
  useEffect(() => {
    if (template) { setSourceLoading(false); return; }
    fetch(`/api/widgets/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((widget) => {
        // In edit mode, load the widget regardless of remixable so the author
        // can always update their own. For remixers, respect remixable.
        if (widget && widget.html && (isEditMode || widget.remixable !== false)) {
          setSource({
            title: widget.title,
            emoji: widget.emoji || '🎮',
            html: widget.html,
            remixHint: isEditMode
              ? `Editing "${widget.title}" — describe what you want to change`
              : `Remix "${widget.title}" — describe what you want to change`,
            id: widget.id,
          });
          setCurrentHtml(widget.html);
          if (isEditMode) {
            setGameTitle(widget.title);
            setHowToPlay(widget.description ?? '');
          }
        }
        setSourceLoading(false);
      })
      .catch(() => setSourceLoading(false));
  }, [id, template]);

  // Initial load: draft (if ?draft= present) or seed with template HTML
  useEffect(() => {
    if (!source) return;
    const draftId = searchParams.get('draft');
    if (draftId) {
      fetch(`/api/drafts/${draftId}`, { headers: ownerHeaders() })
        .then((r) => r.ok ? r.json() : null)
        .then((draft) => {
          if (draft) {
            setCurrentHtml(draft.html);
            if (draft.title && draft.title !== 'Untitled Draft') setGameTitle(draft.title);
            if (draft.description) setHowToPlay(draft.description);
            return fetch(`/api/drafts/${draftId}/messages`, { headers: ownerHeaders() });
          }
          if (template) setCurrentHtml(source.html);
        })
        .then((r) => r?.ok ? r.json() : null)
        .then((msgs) => {
          if (Array.isArray(msgs)) {
            setMessages(msgs);
            // Derive actual iteration count from persisted generation receipts
            const priorGens = msgs.filter((m: Message) => m.kind === 'generate_result').length;
            setRemixCount(priorGens);
          }
        });
    } else if (template) {
      setCurrentHtml(source.html);
    }
    setBlockedByLimit(!isSignedIn && hasUsedCreation());
  }, [source, isSignedIn]);

  // Auto-scroll the thread to bottom when new messages arrive
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, chatStatus]);

  // Cycling reasoning-style status messages during generation, plus an elapsed counter
  useEffect(() => {
    if (chatStatus !== 'generating') {
      setGenReasoningIdx(0);
      setGenElapsed(0);
      return;
    }
    const started = Date.now();
    const tick = setInterval(() => {
      setGenElapsed(Math.floor((Date.now() - started) / 1000));
      setGenReasoningIdx((i) => i + 1);
    }, 2500);
    return () => clearInterval(tick);
  }, [chatStatus]);

  // Per-step elapsed timer for the step orchestrator
  useEffect(() => {
    if (stepStartedAt === null) { setStepElapsed(0); return; }
    const tick = setInterval(() => {
      setStepElapsed(Math.floor((Date.now() - stepStartedAt) / 1000));
    }, 500);
    return () => clearInterval(tick);
  }, [stepStartedAt]);

  // Flush queued message when generation finishes — small delay so the user briefly
  // sees the build complete before the next round of chat-thinking starts.
  useEffect(() => {
    if (chatStatus !== 'idle' || !queuedMessage) return;
    const text = queuedMessage;
    setQueuedMessage(null);
    const t = setTimeout(() => { sendMessage(text); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStatus, queuedMessage]);

  if (sourceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading game...</p>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-950 text-white">
        <p className="text-5xl">😕</p>
        <p className="text-xl font-bold">Game not found</p>
        <button onClick={() => router.push('/')} className="bg-purple-600 text-white px-5 py-2 rounded-xl font-semibold">
          Back to games
        </button>
      </div>
    );
  }

  async function saveDraft(html: string, title: string, description: string) {
    setDraftStatus('saving');
    try {
      if (draftIdRef.current) {
        await fetch(`/api/drafts/${draftIdRef.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...ownerHeaders() },
          body: JSON.stringify({ html, title, description }),
        });
      } else {
        const dr = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...ownerHeaders() },
          body: JSON.stringify({ html, title, description, emoji: source!.emoji, templateId: id }),
        });
        const saved = await dr.json();
        draftIdRef.current = saved.id;
      }
      setDraftStatus('saved');
      setTimeout(() => setDraftStatus('idle'), 2500);
    } catch {
      setDraftStatus('idle');
    }
  }

  // Append a message to the thread (and persist if we have a draft).
  async function persistMessage(msg: Omit<Message, 'id' | 'createdAt'>) {
    if (!draftIdRef.current) return null;
    const res = await fetch(`/api/drafts/${draftIdRef.current}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ownerHeaders() },
      body: JSON.stringify(msg),
    });
    if (!res.ok) return null;
    const saved = await res.json();
    setMessages((m) => [...m, saved]);
    return saved as Message;
  }

  // Create a snapshot and return its ID — used to attach checkpoints to generate_result messages.
  async function persistSnapshot(version: number, html: string): Promise<string | undefined> {
    if (!draftIdRef.current) return undefined;
    try {
      const res = await fetch(`/api/drafts/${draftIdRef.current}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ownerHeaders() },
        body: JSON.stringify({ version, html }),
      });
      if (!res.ok) return undefined;
      const saved = await res.json();
      return saved.id as string;
    } catch {
      return undefined;
    }
  }

  // One-shot generation for SIMPLE chat-classified `generate` instructions (no plan).
  async function runGeneration(instruction: string) {
    if (blockedByLimit && remixCount === 0) {
      setChatError('Sign in to generate more games (free, no password).');
      return;
    }
    setChatStatus('generating');
    interruptedRef.current = false;
    abortRef.current = new AbortController();
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: instruction, baseHtml: currentHtml }),
        signal: abortRef.current.signal,
      });
      const data = await safeJson<{ html?: string; title?: string; description?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      trackResultGenerated('remix', source!.title);
      setHistory((h) => [...h, currentHtml]);
      setCurrentHtml(data.html!);
      const newVersion = remixCount + 1;
      setRemixCount(newVersion);

      if (remixCount === 0) { markCreationUsed(); setBlockedByLimit(true); }

      const newTitle = data.title || gameTitle;
      const newDesc = data.description || howToPlay;
      if (data.title) setGameTitle(newTitle);
      if (data.description) setHowToPlay(newDesc);

      await saveDraft(data.html!, newTitle, newDesc);
      const snapshotId = await persistSnapshot(newVersion, data.html!);

      await persistMessage({
        role: 'assistant',
        kind: 'generate_result',
        content: `✨ Built v${newVersion} — ${data.title || 'remix applied'}`,
        payload: { version: newVersion, snapshotId },
      });

      setChatStatus('idle');
    } catch (err) {
      if (interruptedRef.current || (err as Error).name === 'AbortError') {
        // Stop is a user action, not an error — stay quiet
      } else {
        const errMsg = err instanceof Error ? err.message : 'Generation failed';
        trackError({ error_type: 'generation_failed', error_message: errMsg, error_location: 'template_page' });
        setChatError(errMsg);
      }
      setChatStatus('idle');
    } finally {
      abortRef.current = null;
    }
  }

  // Step-by-step plan executor. Iterates plan.steps from `fromIndex`, calling
  // /api/create/step for each and updating the iframe + draft incrementally.
  // On any step failure, persists a 'failed' step_result and stops. Retry button
  // re-enters this function with the failed step's index.
  async function runStepByStep(planMessageId: string, plan: Plan, fromIndex: number = 0) {
    if (blockedByLimit && remixCount === 0) {
      setChatError('Sign in to generate more games (free, no password).');
      return;
    }
    setChatError('');
    setChatStatus('generating');
    setExecutingPlanId(planMessageId);
    interruptedRef.current = false;

    // We deliberately keep `currentHtml` (the iframe source) stable through the entire
    // build so the user can keep playing the old version. `workingHtml` accumulates
    // the in-progress build and only swaps into the iframe after all steps succeed.
    const stableHtml = currentHtml;
    let workingHtml = currentHtml;

    for (let i = fromIndex; i < plan.steps.length; i++) {
      // Check for interrupt before starting each step — silent stop, plan card shows state
      if (interruptedRef.current) {
        setExecutingPlanId(null);
        setExecutingStepIndex(null);
        setStepStartedAt(null);
        setChatStatus('idle');
        return;
      }

      setExecutingStepIndex(i);
      setStepStartedAt(Date.now());
      const startedAt = Date.now();
      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/create/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentHtml: workingHtml,
            planSummary: plan.summary,
            allSteps: plan.steps,
            stepIndex: i,
          }),
          signal: abortRef.current.signal,
        });
        const data = await safeJson<{ html?: string }>(res);
        if (!res.ok || !data.html) throw new Error(data.error || 'Step failed');

        workingHtml = data.html;
        // Intentionally NOT calling setCurrentHtml here — iframe stays on stableHtml
        // until all steps complete. The plan checklist provides the "live progress".

        // Persist the in-progress HTML so a refresh-and-resume works correctly.
        // Draft.html always reflects the latest committed step.
        await saveDraft(workingHtml, gameTitle, howToPlay);

        await persistMessage({
          role: 'assistant',
          kind: 'step_result',
          content: `✓ Step ${i + 1}: ${plan.steps[i]}`,
          payload: {
            planMessageId,
            stepIndex: i,
            status: 'done',
            durationMs: Date.now() - startedAt,
          },
        });
        abortRef.current = null;
      } catch (err) {
        const wasInterrupted = interruptedRef.current || (err as Error).name === 'AbortError';
        const errMsg = wasInterrupted ? 'Stopped by user' : (err instanceof Error ? err.message : 'Step failed');
        // Persist a failed step_result either way — that's what triggers the Resume button
        await persistMessage({
          role: 'assistant',
          kind: 'step_result',
          content: wasInterrupted ? `✋ Step ${i + 1} stopped` : `✗ Step ${i + 1} failed`,
          payload: {
            planMessageId, stepIndex: i, status: 'failed', errorMessage: errMsg,
          },
        });
        // On user-initiated stop, stay quiet — the paused plan card with its Resume button is enough signal
        if (!wasInterrupted) {
          setChatError(`Step ${i + 1} failed: ${errMsg}. You can retry it from the plan card.`);
        }
        setExecutingPlanId(null);
        setExecutingStepIndex(null);
        setStepStartedAt(null);
        abortRef.current = null;
        setChatStatus('idle');
        trackError({ error_type: 'step_failed', error_message: errMsg, error_location: 'template_page' });
        return;
      }
    }

    // All steps succeeded — atomically swap the iframe to the finished version
    setHistory((h) => [...h, stableHtml]);
    setCurrentHtml(workingHtml);

    const newVersion = remixCount + 1;
    setRemixCount(newVersion);
    if (remixCount === 0) { markCreationUsed(); setBlockedByLimit(true); }
    await saveDraft(workingHtml, gameTitle, howToPlay);
    const snapshotId = await persistSnapshot(newVersion, workingHtml);

    await persistMessage({
      role: 'assistant',
      kind: 'generate_result',
      content: `✨ Built v${newVersion} — ${plan.summary}`,
      payload: { version: newVersion, snapshotId, stepCount: plan.steps.length },
    });

    setExecutingPlanId(null);
    setExecutingStepIndex(null);
    setStepStartedAt(null);
    setChatStatus('idle');
    trackResultGenerated('remix', source!.title);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;

    // If a build is in progress, queue the message — auto-sent when orchestrator goes idle
    if (chatStatus !== 'idle') {
      setQueuedMessage(text);
      setInput('');
      return;
    }

    if (blockedByLimit && remixCount === 0) {
      setChatError('Sign in to remix games (free, no password).');
      return;
    }
    setInput('');
    await sendMessage(text);
  }

  async function sendMessage(text: string) {
    setChatError(''); setChatStatus('chatting');
    interruptedRef.current = false;
    abortRef.current = new AbortController();

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      kind: 'chat',
      content: text,
      payload: null,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ownerHeaders() },
        body: JSON.stringify({
          draftId: draftIdRef.current,
          userMessage: text,
          currentHtml,
          templateId: id,
          emoji: source!.emoji,
        }),
        signal: abortRef.current.signal,
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Chat failed');

      if (data.draftId && !draftIdRef.current) draftIdRef.current = data.draftId;

      const assistantMessage: Message = data.message;
      setMessages((m) => {
        const withoutOptim = m.filter((x) => x.id !== optimistic.id);
        return [...withoutOptim,
          { ...optimistic, id: `user-${assistantMessage.id}` },
          assistantMessage,
        ];
      });

      if (data.instruction) {
        await runGeneration(data.instruction);
      } else {
        setChatStatus('idle');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      // Stopping isn't a failure — drop the optimistic message and go quiet.
      if (interruptedRef.current || (err as Error).name === 'AbortError') {
        setChatStatus('idle');
        return;
      }
      const errMsg = err instanceof Error ? err.message : 'Chat failed';
      setChatError(errMsg);
      setChatStatus('idle');
    } finally {
      abortRef.current = null;
    }
  }

  function handleInterrupt() {
    interruptedRef.current = true;
    abortRef.current?.abort();
    // Cancel any queued message — user clearly wants things to stop, not auto-continue.
    setQueuedMessage(null);
  }

  // Revert the active iframe + draft to a prior snapshot. Persists a checkpoint_revert
  // message so the chat history (and the agent's next /api/chat call) reflects the change.
  async function handleRevert(snapshotId: string, targetVersion: number) {
    if (chatStatus !== 'idle') return;
    setChatError('');
    try {
      const res = await fetch(`/api/snapshots/${snapshotId}`, { headers: ownerHeaders() });
      const data = await safeJson<{ html?: string }>(res);
      if (!res.ok || !data.html) throw new Error(data.error || 'Failed to load snapshot');

      setHistory((h) => [...h, currentHtml]);
      setCurrentHtml(data.html);
      await saveDraft(data.html, gameTitle, howToPlay);

      await persistMessage({
        role: 'user',
        kind: 'checkpoint_revert',
        content: `↩ Reverted to v${targetVersion}`,
        payload: { targetVersion, snapshotId },
      });
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Revert failed');
    }
  }

  function handleUndo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrentHtml(prev);
    setRemixCount((n) => Math.max(0, n - 1));
  }

  async function handlePublish() {
    if (!gameTitle.trim()) return;
    trackCTAClick({ cta_text: isEditMode ? 'Save Edit' : 'Publish', cta_location: 'template_page', cta_destination: isEditMode ? 'edit_save' : 'publish' });
    setEmailError('');

    // Author edit-mode → PATCH the existing widget instead of creating a new one.
    if (isEditMode && isSignedIn) {
      try {
        const res = await fetch(`/api/widgets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: gameTitle.trim(),
            description: howToPlay.trim() || source!.title,
            html: currentHtml,
            remixable: allowRemixes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        router.push(`/play/${id}`);
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : 'Failed to save changes');
      }
      return;
    }

    if (isSignedIn) {
      try {
        const res = await fetch('/api/widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: gameTitle.trim(),
            description: howToPlay.trim() || `Remix of ${source!.title}`,
            emoji: source!.emoji,
            html: currentHtml,
            author: 'Me',
            tags: source!.id ? [source!.id] : [],
            remixable: allowRemixes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (draftIdRef.current) {
          fetch(`/api/drafts/${draftIdRef.current}`, { method: 'DELETE', headers: ownerHeaders() }).catch(() => {});
          draftIdRef.current = null;
        }
        router.push(`/play/${data.id}?new=1`);
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : 'Failed to publish');
      }
      return;
    }

    if (!email.trim()) return;
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          gameData: {
            title: gameTitle.trim(),
            description: howToPlay.trim() || `Remix of ${source!.title}`,
            emoji: source!.emoji,
            html: currentHtml,
            author: email.split('@')[0],
            remixable: allowRemixes,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPublishStep('sent');
      setShowPublish(false);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send email');
    }
  }

  const isBusy = chatStatus !== 'idle';
  const hasRemixed = remixCount > 0;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{source.emoji}</span>
          <span className="font-bold">{source.title}</span>
          {hasRemixed && (
            <span className="text-xs bg-purple-800/60 text-purple-300 px-2 py-0.5 rounded-full">remix v{remixCount}</span>
          )}
          {!hasRemixed && (
            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{template ? 'basic game' : 'original'}</span>
          )}
        </div>
        <div className="w-16" />
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-row">
        {/* Game iframe */}
        <div className="flex-1 min-h-0 relative">
          {chatStatus === 'generating' && (
            <GeneratingBanner
              version={remixCount + 1}
              reasoningIdx={genReasoningIdx}
              elapsed={genElapsed}
            />
          )}
          <iframe
            key={currentHtml.slice(0, 40)}
            srcDoc={currentHtml}
            sandbox="allow-scripts"
            className="w-full h-full block border-0"
            title={source.title}
          />
        </div>

        {/* Sidebar — Chat thread */}
        <div className="shrink-0 w-96 flex flex-col border-l border-gray-800 bg-gray-900">
          {/* Thread header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">💬 Chat</span>
              {hasRemixed && <span className="text-xs text-gray-500">v{remixCount}</span>}
            </div>
            {draftStatus === 'saving' && <span className="text-xs text-gray-500">Saving draft...</span>}
            {draftStatus === 'saved' && <span className="text-xs text-green-400">✓ Saved</span>}
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && publishStep !== 'sent' && (
              <div className="text-xs text-gray-500 leading-relaxed bg-gray-800/50 rounded-xl p-3 border border-gray-800">
                <p className="font-semibold text-gray-300 mb-1">👋 Tell me what to build.</p>
                <p>{source.remixHint}</p>
              </div>
            )}

            {messages.map((m) => {
              const isCurrentVersion = (() => {
                // Re-derive on each render so the "current" badge follows reverts/builds
                let snapId: string | null = null;
                for (let i = messages.length - 1; i >= 0; i--) {
                  const x = messages[i];
                  if (x.kind === 'checkpoint_revert' && x.payload && 'snapshotId' in x.payload) {
                    snapId = (x.payload as CheckpointRevertPayload).snapshotId;
                    break;
                  }
                  if (x.kind === 'generate_result' && x.payload && 'snapshotId' in x.payload && x.payload.snapshotId) {
                    snapId = (x.payload as GenerateResultPayload).snapshotId!;
                    break;
                  }
                }
                if (m.kind === 'generate_result' && m.payload && 'snapshotId' in m.payload) {
                  return (m.payload as GenerateResultPayload).snapshotId === snapId;
                }
                return false;
              })();

              if (m.kind !== 'plan' || !m.payload || !('summary' in m.payload)) {
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    stepStates={null}
                    isCurrentVersion={isCurrentVersion}
                    onApprovePlan={() => {}}
                    onRetryStep={() => {}}
                    onRevert={handleRevert}
                    isBusy={isBusy}
                  />
                );
              }
              const plan = m.payload as Plan;
              const stepResults = messages.filter(
                (n) => n.kind === 'step_result' && n.payload && (n.payload as StepResultPayload).planMessageId === m.id
              );
              const stepStates: StepState[] = plan.steps.map((_, i) => {
                if (executingPlanId === m.id && executingStepIndex === i) {
                  return { status: 'running', elapsed: stepElapsed };
                }
                const matching = stepResults.filter((r) => (r.payload as StepResultPayload).stepIndex === i);
                const last = matching[matching.length - 1];
                if (last) {
                  const p = last.payload as StepResultPayload;
                  return { status: p.status, errorMessage: p.errorMessage, durationMs: p.durationMs };
                }
                return { status: 'pending' };
              });
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  stepStates={stepStates}
                  isCurrentVersion={false}
                  onApprovePlan={(p) => runStepByStep(m.id, p, 0)}
                  onRetryStep={(i) => runStepByStep(m.id, plan, i)}
                  onRevert={handleRevert}
                  isBusy={isBusy}
                />
              );
            })}

            {chatStatus === 'chatting' && (
              <div className="self-start bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-sm text-gray-400 italic">
                Thinking...
              </div>
            )}

            {chatStatus === 'generating' && (
              <ReasoningBubble
                reasoningIdx={genReasoningIdx}
                elapsed={executingStepIndex !== null ? stepElapsed : genElapsed}
                stepLabel={executingStepIndex !== null ? `Step ${executingStepIndex + 1}` : null}
              />
            )}

            {chatError && (
              <div className="self-center text-xs text-red-400 bg-red-900/20 border border-red-900 rounded-lg px-3 py-2">
                {chatError}
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Input */}
          {publishStep !== 'sent' && (
            blockedByLimit && remixCount === 0 ? (
              <div className="shrink-0 m-4 bg-purple-900/30 border border-purple-700 rounded-xl p-4 text-center">
                <p className="font-semibold text-purple-200 text-sm mb-1">Sign in to remix games</p>
                <p className="text-xs text-purple-400 mb-3">It's free — no password needed.</p>
                <button
                  onClick={() => router.push('/sign-in')}
                  className="text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg"
                >
                  Sign In / Create Account →
                </button>
              </div>
            ) : (
              <div className="shrink-0 border-t border-gray-800 p-3 flex flex-col gap-2">
                {queuedMessage && (
                  <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-900/20 border border-purple-700/40 rounded-lg px-2.5 py-1.5">
                    <span>📨 Queued — sends after current build:</span>
                    <span className="text-gray-400 italic truncate flex-1">"{queuedMessage}"</span>
                    <button
                      onClick={() => setQueuedMessage(null)}
                      className="text-gray-500 hover:text-gray-300 text-sm leading-none px-1"
                      title="Cancel queued message"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    className="flex-1 rounded-xl border border-gray-700 bg-gray-800 text-white p-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={
                      isBusy
                        ? '⚡ Type to queue your next message...'
                        : hasRemixed ? 'What else do you want to change?' : source.remixHint
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      title={isBusy ? 'Queue this message' : 'Send'}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 text-white font-bold h-10 px-4 rounded-xl transition-all text-sm"
                    >
                      {isBusy ? '+' : '↑'}
                    </button>
                    {isBusy && (
                      <button
                        onClick={handleInterrupt}
                        title="Stop the current build"
                        className="bg-gray-800 hover:bg-red-600 border border-gray-700 hover:border-red-500 text-gray-300 hover:text-white font-bold h-10 px-3 rounded-xl transition-all text-xs"
                      >
                        ✋
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Undo + Publish — separated from chat input by a thicker divider
              and extra padding so the publish CTA can't be accidentally hit
              when finishing a chat message. */}
          {hasRemixed && publishStep !== 'sent' && (
            <div className="shrink-0 border-t-4 border-gray-800 bg-gray-900/40 px-3 pt-4 pb-3 flex flex-col gap-2">
              {history.length > 0 && (
                <button
                  onClick={handleUndo}
                  disabled={isBusy}
                  className="text-xs text-gray-500 hover:text-gray-300 text-center transition-colors disabled:opacity-40"
                >
                  ↩ Undo last change (v{remixCount} → v{remixCount - 1})
                </button>
              )}

              {!showPublish ? (
                <button
                  onClick={() => setShowPublish(true)}
                  disabled={isBusy}
                  className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 font-semibold py-2.5 rounded-xl transition-all text-sm border border-gray-700"
                >
                  {isEditMode ? '💾 Save changes' : '🚀 Publish this version'}
                </button>
              ) : (
                <PublishForm
                  gameTitle={gameTitle} setGameTitle={setGameTitle}
                  howToPlay={howToPlay} setHowToPlay={setHowToPlay}
                  email={email} setEmail={setEmail} emailError={emailError}
                  allowRemixes={allowRemixes} setAllowRemixes={setAllowRemixes}
                  isSignedIn={!!isSignedIn}
                  isEditMode={isEditMode}
                  onPublish={handlePublish}
                  onCancel={() => setShowPublish(false)}
                />
              )}
            </div>
          )}

          {/* Sent confirmation (guest publish) */}
          {publishStep === 'sent' && (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center flex-1">
              <p className="text-4xl">📬</p>
              <h3 className="font-bold text-lg">Check your inbox!</h3>
              <p className="text-sm text-gray-400">We sent a link to <strong className="text-gray-200">{email}</strong></p>
              <button onClick={() => router.push('/')} className="mt-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold px-5 py-2.5 rounded-xl text-sm">
                Back to games
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function MessageBubble({ message, stepStates, isCurrentVersion, onApprovePlan, onRetryStep, onRevert, isBusy }: {
  message: Message;
  stepStates: StepState[] | null;
  isCurrentVersion: boolean;
  onApprovePlan: (plan: Plan) => void;
  onRetryStep: (stepIndex: number) => void;
  onRevert: (snapshotId: string, targetVersion: number) => void;
  isBusy: boolean;
}) {
  // Suppress step_result messages — they're rendered inline within the plan card above
  if (message.kind === 'step_result') return null;

  // Special styling for revert events — system-style centered pill
  if (message.kind === 'checkpoint_revert') {
    return (
      <div className="self-center text-xs text-amber-300 bg-amber-900/20 border border-amber-800/50 rounded-full px-3 py-1 flex items-center gap-1.5">
        <span>{message.content}</span>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="self-end max-w-[85%] bg-purple-600 rounded-2xl rounded-br-md px-3 py-2 text-sm text-white">
        {message.content}
      </div>
    );
  }

  if (message.kind === 'plan' && message.payload && 'summary' in message.payload && stepStates) {
    const plan = message.payload as Plan;
    const allDone = stepStates.every((s) => s.status === 'done');
    const anyRunning = stepStates.some((s) => s.status === 'running');
    const anyFailed = stepStates.some((s) => s.status === 'failed');
    const anyProgress = stepStates.some((s) => s.status !== 'pending');
    const firstPendingIndex = stepStates.findIndex((s) => s.status === 'pending');

    let headerText = '📋 Gameplan';
    let headerColor = 'text-purple-300';
    let cardClasses = 'bg-gradient-to-br from-purple-900/40 to-pink-900/20 border-purple-700/50';
    if (allDone) { headerText = '✓ Gameplan built'; headerColor = 'text-green-400'; cardClasses = 'bg-green-900/15 border-green-800/50'; }
    else if (anyFailed) { headerText = '⚠ Gameplan paused'; headerColor = 'text-amber-400'; cardClasses = 'bg-amber-900/15 border-amber-800/50'; }
    else if (anyRunning) { headerText = '⚙️ Building...'; headerColor = 'text-purple-300'; }

    return (
      <div className="self-start w-full flex flex-col gap-2">
        {message.content && (
          <div className="bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-sm text-gray-200">{message.content}</div>
        )}
        <div className={`rounded-2xl p-3 flex flex-col gap-2 border ${cardClasses}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wide ${headerColor}`}>{headerText}</span>
            {anyRunning && (
              <span className="text-xs text-gray-500 tabular-nums">
                {stepStates.filter((s) => s.status === 'done').length} / {stepStates.length}
              </span>
            )}
          </div>
          <p className={`text-sm leading-relaxed font-semibold ${allDone ? 'text-gray-300' : 'text-gray-100'}`}>{plan.summary}</p>
          <ul className="flex flex-col gap-2">
            {plan.steps.map((s, i) => (
              <StepRow
                key={i}
                index={i}
                text={s}
                state={stepStates[i]}
                onRetry={() => onRetryStep(i)}
                isBusy={isBusy}
              />
            ))}
          </ul>
          {/* Initial "Build this" button — only when no progress yet */}
          {!anyProgress && (
            <button
              onClick={() => onApprovePlan(plan)}
              disabled={isBusy}
              className="mt-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 text-white font-bold py-2 rounded-xl transition-all text-sm"
            >
              ✨ Build this
            </button>
          )}
          {/* Resume — covers two cases: a step failed, OR the user refreshed mid-execution */}
          {anyProgress && !allDone && !anyRunning && firstPendingIndex >= 0 && (
            <button
              onClick={() => onRetryStep(firstPendingIndex)}
              disabled={isBusy}
              className={`mt-1 disabled:opacity-40 text-white font-bold py-2 rounded-xl transition-all text-sm ${anyFailed ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'}`}
            >
              ▶ Resume from step {firstPendingIndex + 1}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (message.kind === 'generate_result') {
    const payload = message.payload as GenerateResultPayload | null;
    const canRevert = payload?.snapshotId && !isCurrentVersion && !isBusy;
    return (
      <div className="self-stretch bg-green-900/20 border border-green-800/50 rounded-xl px-3 py-2 text-sm text-green-300 font-semibold flex items-center gap-2">
        <span className="flex-1 truncate">{message.content}</span>
        {isCurrentVersion && (
          <span className="text-[10px] bg-green-700/60 text-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide font-bold">
            ✓ current
          </span>
        )}
        {canRevert && payload?.snapshotId && (
          <button
            onClick={() => onRevert(payload.snapshotId!, payload.version)}
            className="text-[11px] bg-gray-800 hover:bg-amber-700 border border-gray-700 hover:border-amber-500 text-gray-300 hover:text-white px-2 py-1 rounded font-semibold transition-colors"
          >
            ↩ Revert
          </button>
        )}
      </div>
    );
  }

  // Regular assistant chat
  return (
    <div className="self-start max-w-[85%] bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-sm text-gray-200 whitespace-pre-wrap">
      {message.content}
    </div>
  );
}

// Single step row inside a plan card. State drives the icon, text styling, and retry button.
function StepRow({ index, text, state, onRetry, isBusy }: {
  index: number; text: string; state: StepState; onRetry: () => void; isBusy: boolean;
}) {
  const num = index + 1;
  if (state.status === 'done') {
    return (
      <li className="flex items-start gap-2 text-xs leading-relaxed">
        <span className="shrink-0 w-4 h-4 mt-0.5 rounded bg-green-600 border border-green-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
        <span className="text-gray-400 line-through decoration-gray-600 flex-1">
          <span className="text-gray-500 font-mono mr-1">{num}.</span>{text}
        </span>
        {state.durationMs && (
          <span className="text-[10px] text-gray-600 tabular-nums shrink-0">{(state.durationMs / 1000).toFixed(0)}s</span>
        )}
      </li>
    );
  }
  if (state.status === 'running') {
    return (
      <li className="flex items-start gap-2 text-xs leading-relaxed">
        <span className="shrink-0 w-4 h-4 mt-0.5 rounded border border-purple-500 bg-purple-900/40 flex items-center justify-center">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        </span>
        <span className="text-purple-200 font-semibold flex-1">
          <span className="text-purple-400 font-mono mr-1">{num}.</span>{text}
        </span>
        <span className="text-[10px] text-purple-400 tabular-nums shrink-0">{state.elapsed}s</span>
      </li>
    );
  }
  if (state.status === 'failed') {
    return (
      <li className="flex flex-col gap-1">
        <div className="flex items-start gap-2 text-xs leading-relaxed">
          <span className="shrink-0 w-4 h-4 mt-0.5 rounded bg-red-700 border border-red-500 text-white flex items-center justify-center text-[10px] font-bold">✗</span>
          <span className="text-red-300 flex-1">
            <span className="text-red-400 font-mono mr-1">{num}.</span>{text}
          </span>
          <button
            onClick={onRetry}
            disabled={isBusy}
            className="text-[10px] bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-2 py-0.5 rounded shrink-0 font-semibold"
          >
            Retry
          </button>
        </div>
        {state.errorMessage && (
          <p className="text-[10px] text-red-400/80 ml-6 italic">{state.errorMessage}</p>
        )}
      </li>
    );
  }
  // pending
  return (
    <li className="flex items-start gap-2 text-xs leading-relaxed">
      <span className="shrink-0 w-4 h-4 mt-0.5 rounded border border-gray-600" />
      <span className="text-gray-400 flex-1">
        <span className="text-gray-500 font-mono mr-1">{num}.</span>{text}
      </span>
    </li>
  );
}

// Reasoning-style phrases that cycle while Sonnet is generating — purely cosmetic
// (we don't have real streaming reasoning tokens), but beats a static "15-30s" lie.
const REASONING_PHRASES = [
  'Analyzing the request',
  'Sketching the game structure',
  'Writing game state and logic',
  'Wiring up controls and events',
  'Styling visuals and feedback',
  'Running sanity checks',
  'Polishing edge cases',
  'Finalizing',
];

// Minimal pill on the iframe to indicate something is building — the detailed
// reasoning lives in the chat thread (ReasoningBubble) where the user is looking.
function GeneratingBanner({ version, elapsed }: { version: number; reasoningIdx: number; elapsed: number }) {
  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-gray-900/95 backdrop-blur-sm border border-purple-600/60 rounded-full px-3 py-1.5 shadow-lg">
      <div className="text-sm animate-spin">⚙️</div>
      <span className="text-xs font-bold text-gray-200">Building v{version}</span>
      <span className="text-xs text-gray-500 tabular-nums font-mono">{elapsed}s</span>
      <span className="text-[10px] text-gray-500 italic hidden sm:inline ml-1">— keep playing</span>
    </div>
  );
}

// Live reasoning shown as an assistant bubble in the chat thread during generation.
// Cycles through generic phases (we don't have real streaming reasoning tokens).
// When step-by-step execution is active, prepends "Step N: " for context.
function ReasoningBubble({ reasoningIdx, elapsed, stepLabel }: { reasoningIdx: number; elapsed: number; stepLabel: string | null }) {
  const phrase = REASONING_PHRASES[reasoningIdx % REASONING_PHRASES.length];
  return (
    <div className="self-start max-w-[90%] bg-gray-800/80 border border-purple-700/30 rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-2.5 text-sm">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
      <span className="text-gray-300 truncate">
        {stepLabel && <span className="text-purple-400 font-mono mr-1.5">{stepLabel}</span>}
        <span className="italic">{phrase}...</span>
      </span>
      <span className="text-xs text-gray-500 tabular-nums shrink-0 ml-auto">{elapsed}s</span>
    </div>
  );
}

function PublishForm(props: {
  gameTitle: string; setGameTitle: (v: string) => void;
  howToPlay: string; setHowToPlay: (v: string) => void;
  email: string; setEmail: (v: string) => void; emailError: string;
  allowRemixes: boolean; setAllowRemixes: (v: boolean) => void;
  isSignedIn: boolean;
  isEditMode?: boolean;
  onPublish: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
        {props.isEditMode ? 'Save changes' : 'Publish'}
      </p>
      <input
        className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Game title"
        value={props.gameTitle}
        onChange={(e) => props.setGameTitle(e.target.value)}
      />
      <textarea
        className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white p-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="How to play... (auto-filled by AI, you can edit)"
        value={props.howToPlay}
        onChange={(e) => props.setHowToPlay(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300 font-medium">Allow remixes</label>
        <button
          type="button"
          onClick={() => props.setAllowRemixes(!props.allowRemixes)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${props.allowRemixes ? 'bg-purple-600' : 'bg-gray-600'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${props.allowRemixes ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {!props.isSignedIn && (
        <input
          type="email"
          className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="your@email.com"
          value={props.email}
          onChange={(e) => props.setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && props.onPublish()}
          autoFocus
        />
      )}
      {props.emailError && <p className="text-red-400 text-xs">{props.emailError}</p>}
      <button
        onClick={props.onPublish}
        disabled={!props.gameTitle.trim() || (!props.isSignedIn && !props.email.trim())}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition-all text-sm"
      >
        {props.isEditMode ? '💾 Save Changes' : props.isSignedIn ? '🚀 Publish Now' : 'Send Magic Link →'}
      </button>
      <button onClick={props.onCancel} className="text-xs text-gray-600 hover:text-gray-400 text-center">
        ← {props.isEditMode ? 'Keep editing' : 'Keep remixing'}
      </button>
    </div>
  );
}
