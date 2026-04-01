'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Widget } from '../lib/store';

const CARD_GRADIENTS: Record<string, string> = {
  wordle: 'from-green-500 to-emerald-700',
  connections: 'from-blue-500 to-indigo-700',
  brainteaser: 'from-purple-500 to-purple-800',
  memory: 'from-pink-500 to-rose-700',
  facts: 'from-cyan-500 to-teal-700',
};

function getGradient(widget: Widget) {
  if (CARD_GRADIENTS[widget.id]) return CARD_GRADIENTS[widget.id];
  const palette = [
    'from-orange-500 to-red-600',
    'from-violet-500 to-purple-700',
    'from-sky-500 to-blue-700',
    'from-lime-500 to-green-700',
    'from-amber-500 to-orange-700',
    'from-fuchsia-500 to-pink-700',
  ];
  const idx = widget.id.charCodeAt(0) % palette.length;
  return palette[idx];
}

interface Props {
  widget: Widget;
  onPlay: (widget: Widget) => void;
}

export default function WidgetCard({ widget, onPlay }: Props) {
  const router = useRouter();
  const [votes, setVotes] = useState(widget.votes);
  const [voted, setVoted] = useState(() => {
    if (typeof window === 'undefined') return false;
    const v = localStorage.getItem('voted_widgets');
    return v ? JSON.parse(v).includes(widget.id) : false;
  });
  const [copied, setCopied] = useState(false);

  async function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    const stored: string[] = JSON.parse(localStorage.getItem('voted_widgets') ?? '[]');
    if (voted) {
      setVoted(false);
      setVotes((v) => Math.max(0, v - 1));
      localStorage.setItem('voted_widgets', JSON.stringify(stored.filter((id) => id !== widget.id)));
      await fetch(`/api/widgets/${widget.id}/vote`, { method: 'DELETE' });
    } else {
      setVoted(true);
      setVotes((v) => v + 1);
      localStorage.setItem('voted_widgets', JSON.stringify([...stored, widget.id]));
      await fetch(`/api/widgets/${widget.id}/vote`, { method: 'POST' });
    }
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/play/${widget.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const gradient = getGradient(widget);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col`}
      onClick={() => onPlay(widget)}
    >
      {/* Created badge */}
      {widget.type === 'user-created' && (
        <span className="absolute top-3 right-3 text-xs bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 font-medium">
          community
        </span>
      )}

      {/* Emoji + title */}
      <div className="text-4xl mb-3">{widget.emoji}</div>
      <h2 className="text-xl font-bold mb-1">{widget.title}</h2>
      <p className="text-sm opacity-80 mb-4 flex-1">{widget.description}</p>

      {/* Author */}
      {widget.author && widget.type === 'user-created' && (
        <p className="text-xs opacity-60 mb-3">by {widget.author}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={() => onPlay(widget)}
          className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-2 text-sm font-semibold transition-colors"
        >
          ▶ Play
        </button>

        {widget.html && widget.remixable !== false && (
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/template/${widget.id}`); }}
            title="Remix this game"
            className="bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
          >
            ✨
          </button>
        )}

        <button
          onClick={handleVote}
          title={voted ? 'Unlike' : 'Like this game'}
          className={`flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            voted ? 'bg-white/40' : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          {voted ? '❤️' : '🤍'} {votes}
        </button>

        <button
          onClick={handleShare}
          title="Copy share link"
          className="bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-sm transition-colors"
        >
          {copied ? '✅' : '🔗'}
        </button>
      </div>
    </div>
  );
}
