'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Widget } from '../../lib/store';
import PlayModal from '../../components/PlayModal';

function NewGameBanner({ widget }: { widget: Widget }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href.split('?')[0]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-base">🎉 Your game is live!</p>
            <p className="text-sm opacity-80 mt-0.5">Share it with anyone — they can play and vote.</p>
          </div>
          <button onClick={() => setVisible(false)} className="opacity-60 hover:opacity-100 text-lg leading-none mt-0.5">✕</button>
        </div>
        <button
          onClick={handleCopy}
          className="bg-white/20 hover:bg-white/30 rounded-xl py-2 text-sm font-semibold transition-colors"
        >
          {copied ? '✅ Copied!' : '🔗 Copy share link'}
        </button>
      </div>
    </div>
  );
}

function PlayPageInner({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const isNew = params.get('new') === '1';

  const [widget, setWidget] = useState<Widget | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/widgets/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => data && setWidget(data));
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-slate-900">
        <p className="text-5xl">😕</p>
        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Game not found</h1>
        <button
          onClick={() => router.push('/')}
          className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
        >
          Back to games
        </button>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-slate-900">
        <div className="animate-spin text-4xl">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-slate-900">
      {isNew && <NewGameBanner widget={widget} />}
      <PlayModal widget={widget} onClose={() => router.push('/')} />
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
