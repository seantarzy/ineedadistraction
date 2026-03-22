'use client';

import { useEffect, useRef, useState } from 'react';
import type { Widget } from '../lib/store';
import BrainTeaser from './BrainTeaser';
import MemoryGame from './MemoryGame';
import FactGenerator from './FactGenerator';
import Wordle from './Wordle';
import Connections from './Connections';

interface Props {
  widget: Widget;
  onClose: () => void;
}

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

export default function PlayModal({ widget, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/play/${widget.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => e.target === backdropRef.current && onClose()}
    >
      {/*
        Key sizing fix:
        - h-[92vh] gives a fixed height so flex children can fill it
        - flex-col + min-h-0 on the content area lets the iframe shrink/fill correctly
      */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl h-[92vh] flex flex-col overflow-hidden">

        {/* Header — fixed height, never shrinks */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{widget.emoji}</span>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{widget.title}</h2>
              {widget.author && widget.type === 'user-created' && (
                <p className="text-xs text-gray-400">by {widget.author}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {copied ? '✅ Copied!' : '🔗 Share'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* How to Play — collapsible, only shown when description exists */}
        {widget.description && (
          <div className="shrink-0 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowHowTo((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span>📖 How to Play</span>
              <span>{showHowTo ? '▲' : '▼'}</span>
            </button>
            {showHowTo && (
              <p className="px-4 pb-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {widget.description}
              </p>
            )}
          </div>
        )}

        {/* Game area — fills all remaining height, never overflows the modal */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {widget.type === 'builtin' && widget.component ? (
            // Builtin React games: scrollable since they weren't designed for constrained height
            <div className="h-full overflow-auto">
              <BuiltinGame component={widget.component} onBack={onClose} />
            </div>
          ) : widget.html ? (
            // User-created & template games: iframe fills exactly the available space
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
    </div>
  );
}
