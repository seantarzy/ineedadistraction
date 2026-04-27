'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import type { Widget } from '../../lib/store';
import BrainTeaser from '../../components/BrainTeaser';
import MemoryGame from '../../components/MemoryGame';
import FactGenerator from '../../components/FactGenerator';
import Wordle from '../../components/Wordle';
import Connections from '../../components/Connections';

function BuiltinGame({ component, onBack }: { component: string; onBack: () => void }) {
  switch (component) {
    case 'Wordle':       return <Wordle onBack={onBack} />;
    case 'Connections':  return <Connections onBack={onBack} />;
    case 'BrainTeaser':  return <BrainTeaser onBack={onBack} />;
    case 'MemoryGame':   return <MemoryGame onBack={onBack} />;
    case 'FactGenerator':return <FactGenerator onBack={onBack} />;
    default: return <p className="text-center text-gray-500 p-8">Game not found</p>;
  }
}

function NewGameBanner() {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href.split('?')[0]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm">Your game is live!</span>
        <span className="text-sm opacity-80">Share it with anyone.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button onClick={() => setVisible(false)} className="opacity-60 hover:opacity-100 text-sm">
          ✕
        </button>
      </div>
    </div>
  );
}

function PlayPageInner({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const isNew = params.get('new') === '1';
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const [widget, setWidget] = useState<Widget | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [votes, setVotes] = useState(0);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    fetch(`/api/widgets/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setWidget(data);
          setVotes(data.votes);
          const stored: string[] = JSON.parse(localStorage.getItem('voted_widgets') ?? '[]');
          setVoted(stored.includes(data.id));
        }
      });
  }, [id]);

  async function handleVote() {
    if (!widget) return;
    const stored: string[] = JSON.parse(localStorage.getItem('voted_widgets') ?? '[]');
    if (voted) {
      setVoted(false);
      setVotes((v) => Math.max(0, v - 1));
      localStorage.setItem('voted_widgets', JSON.stringify(stored.filter((i) => i !== widget.id)));
      await fetch(`/api/widgets/${widget.id}/vote`, { method: 'DELETE' });
    } else {
      setVoted(true);
      setVotes((v) => v + 1);
      localStorage.setItem('voted_widgets', JSON.stringify([...stored, widget.id]));
      await fetch(`/api/widgets/${widget.id}/vote`, { method: 'POST' });
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href.split('?')[0]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-950 text-white">
        <p className="text-5xl">😕</p>
        <h1 className="text-2xl font-bold">Game not found</h1>
        <button
          onClick={() => router.push('/')}
          className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
        >
          Back to all games
        </button>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin text-4xl">⚙️</div>
      </div>
    );
  }

  const canRemix = widget.html && widget.remixable !== false;
  // Author of this widget? They get an Edit button that updates the widget
  // in place rather than creating a remix. widget.userId is the original
  // author's Clerk user ID.
  const isAuthor = !!(isSignedIn && user && widget.userId && widget.userId === user.id);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* New game banner */}
      {isNew && <NewGameBanner />}

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← All games
        </button>

        <div className="flex items-center gap-2">
          <span className="text-lg">{widget.emoji}</span>
          <div className="text-center">
            <h1 className="font-bold text-sm leading-tight">{widget.title}</h1>
            {widget.author && widget.type === 'user-created' && (
              <p className="text-xs text-gray-500">by {widget.author}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleVote}
            title={voted ? 'Unlike' : 'Like this game'}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              voted ? 'bg-purple-800/60 text-purple-300' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {voted ? '❤️' : '🤍'} {votes}
          </button>
          <button
            onClick={handleShare}
            title="Copy share link"
            className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {copied ? 'Copied!' : '🔗'}
          </button>
          {isAuthor ? (
            <button
              onClick={() => router.push(`/template/${widget.id}?edit=1`)}
              title="You created this — edit it directly"
              className="flex items-center gap-1 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-1.5 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
            >
              ✏️ Edit
            </button>
          ) : (
            canRemix && (
              <button
                onClick={() => router.push(`/template/${widget.id}`)}
                className="flex items-center gap-1 text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                ✨ Remix
              </button>
            )
          )}
        </div>
      </header>

      {/* How to play — collapsible */}
      {widget.description && (
        <div className="shrink-0 border-b border-gray-800">
          <button
            onClick={() => setShowHowTo((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-800/50 transition-colors"
          >
            <span>How to Play</span>
            <span>{showHowTo ? '▲' : '▼'}</span>
          </button>
          {showHowTo && (
            <p className="px-4 pb-3 text-xs text-gray-400 leading-relaxed">
              {widget.description}
            </p>
          )}
        </div>
      )}

      {/* Game area — fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {widget.type === 'builtin' && widget.component && !widget.html ? (
          <div className="h-full overflow-auto">
            <BuiltinGame component={widget.component} onBack={() => router.push('/')} />
          </div>
        ) : widget.html ? (
          <iframe
            srcDoc={widget.html}
            sandbox="allow-scripts"
            className="w-full h-full block border-0"
            title={widget.title}
          />
        ) : (
          <p className="text-center text-gray-500 p-8">No game content</p>
        )}
      </div>
    </div>
  );
}

export default function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <PlayPageInner id={id} />
    </Suspense>
  );
}
