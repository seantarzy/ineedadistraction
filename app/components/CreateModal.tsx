'use client';

import { useRouter } from 'next/navigation';
import { TEMPLATES } from '../lib/templates';
import { trackToolUse } from '../lib/analytics';

interface Props {
  onClose: () => void;
}

export default function CreateModal({ onClose }: Props) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#150f24] rounded-3xl border border-purple-500/30 neon-glow-purple w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 shrink-0">
          <div>
            <h2 className="font-pixel text-xs text-purple-100 mb-1">✨ Create a Brain Game</h2>
            <p className="text-sm text-purple-300/50">Start from a proven template and remix it into your own</p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-300/50 hover:text-purple-100 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-purple-500/10 transition-colors text-xl font-light"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-auto">
          <p className="text-xs font-semibold text-purple-300/60 uppercase tracking-wide">Templates</p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { trackToolUse('create_modal', 'select_template', t.id); onClose(); router.push(`/template/${t.id}`); }}
                className="flex flex-col items-start gap-2 p-5 rounded-2xl border-2 border-purple-500/15 hover:border-pink-400/60 bg-[#0a0612] hover:bg-purple-950/40 transition-all text-left group"
              >
                <span className="text-3xl">{t.emoji}</span>
                <span className="font-bold text-purple-100 text-sm">{t.title}</span>
                <span className="text-xs text-purple-300/50 leading-relaxed">{t.description}</span>
                <span className="text-xs text-pink-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                  {t.id === 'blank' ? 'Start building →' : 'Play & Remix →'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-purple-300/40 text-center mt-1">
            Pick a quick loop, change the theme or challenge, and publish your version. You can also remix any community game from its card.
          </p>
        </div>
      </div>
    </div>
  );
}
