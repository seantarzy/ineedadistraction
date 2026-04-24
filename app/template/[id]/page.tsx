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

type Plan = { summary: string; steps: string[] };
type GenerateResultPayload = { version: number };
type MessagePayload = Plan | GenerateResultPayload | null;
type Message = {
  id: string;
  role: 'user' | 'assistant';
  kind: 'chat' | 'plan' | 'generate_result';
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
  const [chatError, setChatError] = useState('');
  const [blockedByLimit, setBlockedByLimit] = useState(false);

  const draftIdRef = useRef<string | null>(searchParams.get('draft'));
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
        if (widget && widget.html && widget.remixable !== false) {
          setSource({ title: widget.title, emoji: widget.emoji || '🎮', html: widget.html, remixHint: `Remix "${widget.title}" — describe what you want to change`, id: widget.id });
          setCurrentHtml(widget.html);
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

  // Generate code from a distilled instruction (either directly from chat or from an approved plan).
  async function runGeneration(instruction: string, plan: Plan | null) {
    // Guest hit daily limit and hasn't started remixing here yet
    if (blockedByLimit && remixCount === 0) {
      setChatError('Sign in to generate more games (free, no password).');
      return;
    }

    setChatStatus('generating');
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: instruction, baseHtml: currentHtml, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      trackResultGenerated('remix', source!.title);
      setHistory((h) => [...h, currentHtml]);
      setCurrentHtml(data.html);
      const newVersion = remixCount + 1;
      setRemixCount(newVersion);

      if (remixCount === 0) {
        markCreationUsed();
        setBlockedByLimit(true);
      }

      const newTitle = data.title || gameTitle;
      const newDesc = data.description || howToPlay;
      if (data.title) setGameTitle(newTitle);
      if (data.description) setHowToPlay(newDesc);

      await saveDraft(data.html, newTitle, newDesc);

      // Append a generate_result message to the thread so users see the build in context
      await persistMessage({
        role: 'assistant',
        kind: 'generate_result',
        content: `✨ Built v${newVersion} — ${data.title || 'remix applied'}`,
        payload: { version: newVersion },
      });

      setChatStatus('idle');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Generation failed';
      trackError({ error_type: 'generation_failed', error_message: errMsg, error_location: 'template_page' });
      setChatError(errMsg);
      setChatStatus('idle');
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || chatStatus !== 'idle') return;
    if (blockedByLimit && remixCount === 0) {
      setChatError('Sign in to remix games (free, no password).');
      return;
    }
    setChatError(''); setInput(''); setChatStatus('chatting');

    // Optimistically show the user's message immediately
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
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');

      // Backend may have just created a draft — capture the ID
      if (data.draftId && !draftIdRef.current) draftIdRef.current = data.draftId;

      // Swap the optimistic user message for the persisted one, then add assistant
      const assistantMessage: Message = data.message;
      setMessages((m) => {
        const withoutOptim = m.filter((x) => x.id !== optimistic.id);
        return [...withoutOptim,
          { ...optimistic, id: `user-${assistantMessage.id}` },
          assistantMessage,
        ];
      });

      // If the AI decided to generate directly, kick that off now
      if (data.instruction) {
        await runGeneration(data.instruction, null);
      } else {
        setChatStatus('idle');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      const errMsg = err instanceof Error ? err.message : 'Chat failed';
      setChatError(errMsg);
      setChatStatus('idle');
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
    trackCTAClick({ cta_text: 'Publish', cta_location: 'template_page', cta_destination: 'publish' });
    setEmailError('');

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
            <GeneratingOverlay
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

            {messages.map((m) => <MessageBubble key={m.id} message={m} onApprovePlan={(plan) => runGeneration(plan.steps.join('. '), plan)} isBusy={isBusy} />)}

            {chatStatus === 'chatting' && (
              <div className="self-start bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-sm text-gray-400 italic">
                Thinking...
              </div>
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
              <div className="shrink-0 border-t border-gray-800 p-3 flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  className="flex-1 rounded-xl border border-gray-700 bg-gray-800 text-white p-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  placeholder={hasRemixed ? 'What else do you want to change?' : source.remixHint}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={isBusy}
                />
                <button
                  onClick={handleSend}
                  disabled={isBusy || !input.trim()}
                  className="shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 text-white font-bold h-10 px-4 rounded-xl transition-all text-sm"
                >
                  {chatStatus === 'generating' ? '⚙️' : chatStatus === 'chatting' ? '💭' : '↑'}
                </button>
              </div>
            )
          )}

          {/* Undo + Publish */}
          {hasRemixed && publishStep !== 'sent' && (
            <div className="shrink-0 border-t border-gray-800 p-3 flex flex-col gap-2">
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
                  🚀 Publish this version
                </button>
              ) : (
                <PublishForm
                  gameTitle={gameTitle} setGameTitle={setGameTitle}
                  howToPlay={howToPlay} setHowToPlay={setHowToPlay}
                  email={email} setEmail={setEmail} emailError={emailError}
                  allowRemixes={allowRemixes} setAllowRemixes={setAllowRemixes}
                  isSignedIn={!!isSignedIn}
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

function MessageBubble({ message, onApprovePlan, isBusy }: { message: Message; onApprovePlan: (plan: Plan) => void; isBusy: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="self-end max-w-[85%] bg-purple-600 rounded-2xl rounded-br-md px-3 py-2 text-sm text-white">
        {message.content}
      </div>
    );
  }

  if (message.kind === 'plan' && message.payload && 'summary' in message.payload) {
    const plan = message.payload as Plan;
    return (
      <div className="self-start w-full flex flex-col gap-2">
        {message.content && (
          <div className="bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-sm text-gray-200">{message.content}</div>
        )}
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-700/50 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">📋 Gameplan</span>
          </div>
          <p className="text-sm text-gray-100 leading-relaxed font-semibold">{plan.summary}</p>
          <ol className="list-decimal list-inside text-xs text-gray-300 space-y-1 marker:text-purple-400 marker:font-bold">
            {plan.steps.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
          </ol>
          <button
            onClick={() => onApprovePlan(plan)}
            disabled={isBusy}
            className="mt-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 text-white font-bold py-2 rounded-xl transition-all text-sm"
          >
            ✨ Build this
          </button>
        </div>
      </div>
    );
  }

  if (message.kind === 'generate_result') {
    return (
      <div className="self-stretch bg-green-900/20 border border-green-800/50 rounded-xl px-3 py-2 text-sm text-green-300 font-semibold flex items-center gap-2">
        <span>{message.content}</span>
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

function GeneratingOverlay({ version, reasoningIdx, elapsed }: { version: number; reasoningIdx: number; elapsed: number }) {
  const phrase = REASONING_PHRASES[reasoningIdx % REASONING_PHRASES.length];
  // After ~45s, acknowledge it's taking a while so users don't assume it's stuck
  const longRunning = elapsed >= 45;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-950/90 backdrop-blur-sm px-6">
      <div className="text-5xl animate-spin">⚙️</div>
      <p className="text-lg font-bold text-gray-200">
        {version === 1 ? 'Building your game...' : `Building iteration v${version}...`}
      </p>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
        <span className="transition-all">{phrase}...</span>
      </div>
      <p className="text-xs text-gray-600 tabular-nums">{elapsed}s elapsed</p>
      {longRunning && (
        <p className="text-xs text-amber-400/80 max-w-xs text-center mt-1">
          Complex games take a bit longer to generate. Hang tight — I'm still on it.
        </p>
      )}
    </div>
  );
}

function PublishForm(props: {
  gameTitle: string; setGameTitle: (v: string) => void;
  howToPlay: string; setHowToPlay: (v: string) => void;
  email: string; setEmail: (v: string) => void; emailError: string;
  allowRemixes: boolean; setAllowRemixes: (v: boolean) => void;
  isSignedIn: boolean;
  onPublish: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Publish</p>
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
        {props.isSignedIn ? '🚀 Publish Now' : 'Send Magic Link →'}
      </button>
      <button onClick={props.onCancel} className="text-xs text-gray-600 hover:text-gray-400 text-center">
        ← Keep remixing
      </button>
    </div>
  );
}
