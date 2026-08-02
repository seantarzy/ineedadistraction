'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Widget } from '../lib/store';
import { trackContentEngagement, trackToolUse, trackShareClick, trackCTAClick } from '../lib/analytics';

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
      trackToolUse('game', 'unlike', widget.id);
      setVoted(false);
      setVotes((v) => Math.max(0, v - 1));
      localStorage.setItem('voted_widgets', JSON.stringify(stored.filter((id) => id !== widget.id)));
      await fetch(`/api/widgets/${widget.id}/vote`, { method: 'DELETE' });
    } else {
      trackToolUse('game', 'like', widget.id);
      setVoted(true);
      setVotes((v) => v + 1);
      localStorage.setItem('voted_widgets', JSON.stringify([...stored, widget.id]));
      await fetch(`/api/widgets/${widget.id}/vote`, { method: 'POST' });
    }
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    trackShareClick({ method: 'clipboard', content_type: 'game', content_id: widget.id });
    const url = `${window.location.origin}/play/${widget.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const gradient = getGradient(widget);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white border border-white/10 shadow-lg hover:shadow-2xl hover:border-white/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(255,255,255,0.15)] cursor-pointer flex flex-col`}
      onClick={() => { trackContentEngagement({ content_type: 'game', content_id: widget.id, engagement_type: 'interaction' }); onPlay(widget); }}
    >
      {/* Created badge */}
      {widget.type === 'user-created' && (
        <span className="absolute top-3 right-3 text-xs bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 font-medium">
          community
        </span>
      )}

      {/* Emoji + title */}
      <div className="text-4xl mb-3">{widget.emoji}</div>
      <h2 className="font-pixel text-xs leading-relaxed mb-2">{widget.title}</h2>
      <p className="text-sm opacity-80 mb-4 flex-1">{widget.description}</p>

      {/* Author */}
      {widget.author && widget.type === 'user-created' && (
        <p className="text-xs opacity-60 mb-3">by {widget.author}</p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/80 font-arcade tracking-wide">
        <span className="rounded-full bg-white/15 px-2 py-1 text-sm">{widget.views} plays</span>
        <span className="rounded-full bg-white/15 px-2 py-1 text-sm">{widget.remixCount ?? 0} remixes</span>
      </div>

      {widget.parent && (
        <p className="mb-3 text-xs text-white/70">
          remixed from {widget.parent.emoji} {widget.parent.title}
        </p>
      )}

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-2">
        {/* Remix is the core loop — loud, full-width, glowing CTA on top */}
        {widget.html && widget.remixable !== false && (
          <button
            onClick={(e) => { e.stopPropagation(); trackCTAClick({ cta_text: 'Remix', cta_location: 'widget_card', cta_destination: `/template/${widget.id}` }); router.push(`/template/${widget.id}`); }}
            title="Remix this game — tweak it with AI and make it your own"
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-white rounded-xl py-3 text-base font-extrabold shadow-[0_0_16px_rgba(255,255,255,0.45)] hover:shadow-[0_0_26px_rgba(255,255,255,0.8)] transition-all"
          >
            ✨ Remix this game
          </button>
        )}

        {/* Secondary: Play + vote + share */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPlay(widget)}
            className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl py-2 text-sm font-semibold transition-colors"
          >
            ▶ Play
          </button>

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
    </div>
  );
}
