'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { getTemplate } from '../../lib/templates';
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
function toTitle(s: string) {
  return s.replace(/^(a|an|the)\s+/i, '').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 48);
}

type Step = 'idle' | 'generating' | 'email' | 'sent';

// Source info for what we're remixing — either a template or a published widget
type Source = { title: string; emoji: string; html: string; remixHint: string; id: string };

export default function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const template = getTemplate(id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Source can be a template or a fetched widget
  const [source, setSource] = useState<Source | null>(
    template ? { title: template.title, emoji: template.emoji, html: template.html, remixHint: template.remixHint, id: template.id } : null
  );
  const [sourceLoading, setSourceLoading] = useState(!template);

  // The HTML currently displayed in the iframe
  const [currentHtml, setCurrentHtml] = useState<string>('');
  // All remix steps taken so far (for undo)
  const [history, setHistory] = useState<string[]>([]);
  // How many remixes have been done this session on THIS game
  const [remixCount, setRemixCount] = useState(0);

  const [step, setStep] = useState<Step>('idle');
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState('');
  const [genError, setGenError] = useState('');

  // Gate: has the user already used their one free creation elsewhere?
  // Once they start remixing HERE, further iterations on this game are free.
  const [blockedByLimit, setBlockedByLimit] = useState(false);

  // Draft auto-save
  const draftIdRef = useRef<string | null>(searchParams.get('draft'));
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Publish flow
  const [gameTitle, setGameTitle] = useState('');
  const [howToPlay, setHowToPlay] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [allowRemixes, setAllowRemixes] = useState(true);

  // Fetch published widget if not a template
  useEffect(() => {
    if (template) {
      setSourceLoading(false);
      return;
    }
    // Try loading as a published widget
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

  useEffect(() => {
    if (!source) return;
    const draftId = searchParams.get('draft');
    if (draftId && isSignedIn) {
      // Load existing draft HTML
      fetch(`/api/drafts/${draftId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((draft) => {
          if (draft) {
            setCurrentHtml(draft.html);
            if (draft.title && draft.title !== 'Untitled Draft') setGameTitle(draft.title);
            if (draft.description) setHowToPlay(draft.description);
            setRemixCount(1); // treat draft as already having at least one remix
          } else if (template) {
            setCurrentHtml(source.html);
          }
        });
    } else if (template) {
      setCurrentHtml(source.html);
    }
    setBlockedByLimit(!isSignedIn && hasUsedCreation());
  }, [source, isSignedIn]);

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

  async function handleGenerate() {
    // Allow further remixes on this game even if limit was hit (remixCount > 0 means they started here)
    if (blockedByLimit && remixCount === 0) return;
    if (!prompt.trim()) { setPromptError('Describe what you want to change!'); return; }

    setPromptError(''); setGenError(''); setStep('generating');

    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Always pass the current version as the base so each remix builds on the last
        body: JSON.stringify({ prompt, baseHtml: currentHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save current to history for undo
      trackResultGenerated('remix', source!.title);
      setHistory((h) => [...h, currentHtml]);
      setCurrentHtml(data.html);
      setRemixCount((n) => n + 1);

      // Mark creation used on first successful remix
      if (remixCount === 0) {
        markCreationUsed();
        setBlockedByLimit(true);
      }

      // Auto-populate title + how-to-play from AI (user can override)
      const newTitle = data.title || gameTitle;
      const newDesc = data.description || howToPlay;
      if (data.title) setGameTitle(newTitle);
      if (data.description) setHowToPlay(newDesc);

      // Auto-save draft for signed-in users
      if (isSignedIn) {
        setDraftStatus('saving');
        try {
          if (draftIdRef.current) {
            await fetch(`/api/drafts/${draftIdRef.current}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ html: data.html, title: newTitle, description: newDesc }),
            });
          } else {
            const dr = await fetch('/api/drafts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ html: data.html, title: newTitle, description: newDesc, emoji: source!.emoji, templateId: id }),
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

      setPrompt('');
      setStep('idle');
      // Refocus textarea for next iteration
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Generation failed';
      trackError({ error_type: 'generation_failed', error_message: errMsg, error_location: 'template_page' });
      setGenError(errMsg);
      setStep('idle');
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
      // Direct publish — userId attached server-side via auth()
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
        // Delete draft now that it's published
        if (draftIdRef.current) {
          fetch(`/api/drafts/${draftIdRef.current}`, { method: 'DELETE' }).catch(() => {});
          draftIdRef.current = null;
        }
        router.push(`/play/${data.id}?new=1`);
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : 'Failed to publish');
      }
      return;
    }

    // Guest: magic link email gate
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
      setStep('sent');
      setShowPublish(false);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send email');
    }
  }

  const isGenerating = step === 'generating';
  const hasRemixed = remixCount > 0;

  // Cycling status messages during generation
  const GEN_MESSAGES = [
    'Reading your prompt...',
    'Designing the game loop...',
    'Writing the HTML...',
    'Adding interactivity...',
    'Polishing the UI...',
    'Almost there...',
  ];
  const [genMsgIdx, setGenMsgIdx] = useState(0);
  useEffect(() => {
    if (!isGenerating) { setGenMsgIdx(0); return; }
    const id = setInterval(() => setGenMsgIdx((i) => (i + 1) % GEN_MESSAGES.length), 3000);
    return () => clearInterval(id);
  }, [isGenerating]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{source.emoji}</span>
          <span className="font-bold">{source.title}</span>
          {hasRemixed && (
            <span className="text-xs bg-purple-800/60 text-purple-300 px-2 py-0.5 rounded-full">
              remix v{remixCount}
            </span>
          )}
          {!hasRemixed && (
            <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{template ? 'basic game' : 'original'}</span>
          )}
        </div>
        <div className="w-16" />
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-row">

        {/* Game iframe — always visible */}
        <div className="flex-1 min-h-0 relative">
          {isGenerating && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gray-950/90 backdrop-blur-sm">
              <div className="text-5xl animate-spin">⚙️</div>
              <p className="text-lg font-bold text-gray-200">
                {remixCount === 0 ? 'Building your remix...' : `Applying iteration ${remixCount + 1}...`}
              </p>
              <p className="text-gray-500 text-sm transition-all">{GEN_MESSAGES[genMsgIdx]}</p>
            </div>
          )}
          <iframe
            // key forces remount when html changes so the game restarts cleanly
            key={currentHtml.slice(0, 40)}
            srcDoc={currentHtml}
            sandbox="allow-scripts"
            className="w-full h-full block border-0"
            title={source.title}
          />
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────────── */}
        <div className="shrink-0 w-80 flex flex-col border-l border-gray-800 bg-gray-900 overflow-y-auto">

          {/* Remix prompt — always present */}
          {step !== 'sent' && (
            <div className="flex flex-col gap-3 p-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">
                    {hasRemixed ? `Iterate further` : 'Remix this game'}
                  </h3>
                  {draftStatus === 'saving' && (
                    <span className="text-xs text-gray-500">Saving draft...</span>
                  )}
                  {draftStatus === 'saved' && (
                    <span className="text-xs text-green-400">✓ Draft saved</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                  {hasRemixed
                    ? 'Describe another change — each remix builds on the last.'
                    : source.remixHint}
                </p>
              </div>

              {/* Blocked: hit limit and haven't started yet */}
              {blockedByLimit && remixCount === 0 ? (
                <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-4 text-center">
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
                <>
                  <textarea
                    ref={textareaRef}
                    className={`w-full rounded-xl border ${promptError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder={
                      hasRemixed
                        ? 'What else do you want to change?'
                        : source.remixHint
                    }
                    value={prompt}
                    onChange={(e) => { setPrompt(e.target.value); setPromptError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleGenerate()}
                    disabled={isGenerating}
                  />
                  {promptError && <p className="text-red-400 text-xs">{promptError}</p>}
                  {genError && <p className="text-red-400 text-xs">{genError}</p>}

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                  >
                    {isGenerating ? '⚙️ Generating...' : hasRemixed ? '✨ Apply Change' : '✨ Generate Remix'}
                  </button>

                  {/* Undo */}
                  {history.length > 0 && (
                    <button
                      onClick={handleUndo}
                      disabled={isGenerating}
                      className="text-xs text-gray-500 hover:text-gray-300 text-center transition-colors"
                    >
                      ↩ Undo last change (v{remixCount} → v{remixCount - 1})
                    </button>
                  )}

                  {!hasRemixed && (
                    <p className="text-xs text-gray-600 text-center">You must add a twist to publish.</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Publish section — shown after first remix */}
          {hasRemixed && step !== 'sent' && (
            <div className="px-5 pb-5 flex flex-col gap-3 border-t border-gray-800 pt-4 mt-auto">
              {!showPublish ? (
                <button
                  onClick={() => setShowPublish(true)}
                  disabled={isGenerating}
                  className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 font-semibold py-2.5 rounded-xl transition-all text-sm border border-gray-700"
                >
                  🚀 Publish this version
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Publish</p>
                  <input
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Game title"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white p-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="How to play... (auto-filled by AI, you can edit)"
                    value={howToPlay}
                    onChange={(e) => setHowToPlay(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-300 font-medium">Allow remixes</label>
                      <div className="relative group">
                        <span className="text-gray-500 cursor-help text-xs">(?)</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-700 text-gray-200 text-xs rounded-lg p-2.5 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-10">
                          Other players can use your game as a starting point to create their own remix.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowRemixes(!allowRemixes)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allowRemixes ? 'bg-purple-600' : 'bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${allowRemixes ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {!isSignedIn && (
                    <input
                      type="email"
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePublish()}
                      autoFocus
                    />
                  )}
                  {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                  <button
                    onClick={handlePublish}
                    disabled={!gameTitle.trim() || (!isSignedIn && !email.trim())}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                  >
                    {isSignedIn ? '🚀 Publish Now' : 'Send Magic Link →'}
                  </button>
                  <button onClick={() => setShowPublish(false)} className="text-xs text-gray-600 hover:text-gray-400 text-center">
                    ← Keep remixing
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sent confirmation */}
          {step === 'sent' && (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center flex-1">
              <p className="text-4xl">📬</p>
              <h3 className="font-bold text-lg">Check your inbox!</h3>
              <p className="text-sm text-gray-400">
                We sent a link to <strong className="text-gray-200">{email}</strong>
              </p>
              <p className="text-xs text-gray-600">Click it to publish your game and get your shareable link.</p>
              <button
                onClick={() => router.push('/')}
                className="mt-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                Back to games
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
