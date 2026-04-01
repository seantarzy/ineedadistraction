'use client';

import { useRouter } from 'next/navigation';
import { TEMPLATES } from '../lib/templates';

interface Props {
  onClose: () => void;
}

export default function CreateModal({ onClose }: Props) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">✨ Create a Game</h2>
            <p className="text-sm text-gray-400">Start from a basic game and remix it into your own</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xl font-light"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-auto">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Basic Games</p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { onClose(); router.push(`/template/${t.id}`); }}
                className="flex flex-col items-start gap-2 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-500 bg-gray-50 dark:bg-gray-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group"
              >
                <span className="text-3xl">{t.emoji}</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t.title}</span>
                <span className="text-xs text-gray-400 leading-relaxed">{t.description}</span>
                <span className="text-xs text-purple-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                  {t.id === 'blank' ? 'Start building →' : 'Play & Remix →'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-1">
            You can also remix any community game — look for the ✨ button on game cards.
          </p>
        </div>
      </div>
    </div>
  );
}
