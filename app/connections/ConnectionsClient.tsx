'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const MAX_MISTAKES = 4;
const CATEGORY_COLORS = [
  // Inspired by NYT Connections' yellow/green/blue/purple palette but darker
  // for our slate-night theme. Index = order categories were solved in.
  'bg-yellow-500/20 border-yellow-500/60 text-yellow-200',
  'bg-emerald-500/20 border-emerald-500/60 text-emerald-200',
  'bg-sky-500/20 border-sky-500/60 text-sky-200',
  'bg-fuchsia-500/20 border-fuchsia-500/60 text-fuchsia-200',
];

interface FoundCategory {
  /** Server-assigned 0..3 index, used to fetch the canonical when naming. */
  categoryIndex: number;
  words: string[];
  /** Filled in only after the player names the theme. */
  score?: number;
  canonical?: string;
  judgeNote?: string;
  /** What the player typed (kept for the share string). */
  guess?: string;
}

interface SavedState {
  date: string;
  found: FoundCategory[];
  mistakes: number;
  done: boolean;
}

function storageKey(date: string) {
  return `quartet:${date}`;
}

function loadState(date: string): SavedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.date === date) return parsed as SavedState;
  } catch { /* ignore */ }
  return null;
}

function saveState(state: SavedState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(state.date), JSON.stringify(state));
  } catch { /* ignore */ }
}

export default function ConnectionsClient() {
  const [date, setDate] = useState<string | null>(null);
  const [allWords, setAllWords] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [found, setFound] = useState<FoundCategory[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [groupingStatus, setGroupingStatus] = useState<'idle' | 'submitting' | 'wrong' | 'oneAway'>('idle');

  // Naming flow — when a grouping was just confirmed, prompt for category name.
  const [namingFor, setNamingFor] = useState<FoundCategory | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [namingStatus, setNamingStatus] = useState<'idle' | 'judging' | 'judged'>('idle');
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Load today's puzzle + restore any saved progress.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/connections/today');
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (!cancelled) setLoadError(err.error || 'No puzzle today');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setDate(data.date);
        setAllWords(data.words as string[]);
        const saved = loadState(data.date);
        if (saved) {
          setFound(saved.found);
          setMistakes(saved.mistakes);
        }
      } catch {
        if (!cancelled) setLoadError('Network error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const foundWords = useMemo(() => new Set(found.flatMap((c) => c.words)), [found]);
  const remaining = useMemo(() => allWords.filter((w) => !foundWords.has(w)), [allWords, foundWords]);
  const won = found.length === 4 && found.every((c) => c.score !== undefined);
  const lost = mistakes >= MAX_MISTAKES;
  const done = won || lost;

  // Persist on every state change.
  useEffect(() => {
    if (!date) return;
    saveState({ date, found, mistakes, done });
  }, [date, found, mistakes, done]);

  function toggle(word: string) {
    if (foundWords.has(word) || namingFor || done) return;
    setSelected((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= 4) return prev;
      return [...prev, word];
    });
    setGroupingStatus('idle');
  }

  async function submitGrouping() {
    if (selected.length !== 4 || !date || groupingStatus === 'submitting') return;
    setGroupingStatus('submitting');
    try {
      const res = await fetch('/api/connections/check-grouping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, words: selected }),
      });
      const data = await res.json();
      if (data.correct) {
        const newFound: FoundCategory = {
          categoryIndex: data.categoryIndex,
          words: [...selected],
        };
        setFound((prev) => [...prev, newFound]);
        setSelected([]);
        setNamingFor(newFound);
        setNameInput('');
        setNamingStatus('idle');
        setGroupingStatus('idle');
        // Defer focus until input has rendered
        setTimeout(() => nameInputRef.current?.focus(), 50);
      } else {
        setMistakes((m) => m + 1);
        setGroupingStatus(data.oneAway ? 'oneAway' : 'wrong');
        // Buzz then deselect
        setTimeout(() => {
          setSelected([]);
          setGroupingStatus('idle');
        }, 1100);
      }
    } catch {
      setGroupingStatus('idle');
    }
  }

  async function submitName() {
    if (!namingFor || !date || !nameInput.trim() || namingStatus === 'judging') return;
    setNamingStatus('judging');
    try {
      const res = await fetch('/api/connections/check-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          categoryIndex: namingFor.categoryIndex,
          guess: nameInput.trim(),
        }),
      });
      const data = await res.json();
      const updated: FoundCategory = {
        ...namingFor,
        score: typeof data.score === 'number' ? data.score : 0,
        canonical: data.canonical,
        judgeNote: data.judgeNote,
        guess: nameInput.trim(),
      };
      setFound((prev) => prev.map((c) => (c.categoryIndex === namingFor.categoryIndex ? updated : c)));
      setNamingStatus('judged');
      // Linger briefly on the score, then dismiss the naming card.
      setTimeout(() => {
        setNamingFor(null);
        setNamingStatus('idle');
        setNameInput('');
      }, 2200);
    } catch {
      setNamingStatus('idle');
    }
  }

  function shareString(): string {
    if (!date) return '';
    const total = found.reduce((s, c) => s + (c.score ?? 0), 0);
    const max = found.length * 100;
    const emojis = found.map((c) => {
      const s = c.score ?? 0;
      if (s >= 90) return '🟢';
      if (s >= 70) return '🟡';
      return '🔴';
    }).join('');
    return `Quartet ${date} — ${total}/${max}\n${emojis}\nineedadistraction.com/connections`;
  }

  const [copied, setCopied] = useState(false);
  function copyShare() {
    navigator.clipboard.writeText(shareString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (loadError) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-300 p-6 text-center">
        <div>
          <p className="text-lg mb-2">No puzzle ready yet.</p>
          <p className="text-sm text-slate-500">{loadError}</p>
        </div>
      </div>
    );
  }
  if (!date) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="animate-spin text-2xl">⚙️</div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">Quartet</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mt-1">{date}</p>
          <p className="text-sm text-slate-300 mt-3 max-w-md mx-auto leading-relaxed">
            Group the words. Then name the theme. The AI scores how close you got.
          </p>
        </header>

        {/* Found categories — stacked at the top */}
        <div className="space-y-2 mb-4">
          {found.map((c, idx) => (
            <FoundRow
              key={c.categoryIndex}
              cat={c}
              tone={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
            />
          ))}
        </div>

        {/* Naming overlay (inline, not a modal — flow stays in place) */}
        {namingFor && (
          <div className="mb-4 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 p-4">
            <p className="text-xs uppercase tracking-widest text-fuchsia-300 mb-2">
              Nice grouping. What connects them?
            </p>
            <div className="flex gap-2 mb-2 flex-wrap">
              {namingFor.words.map((w) => (
                <span key={w} className="text-xs bg-fuchsia-500/20 border border-fuchsia-500/40 rounded px-2 py-0.5">{w}</span>
              ))}
            </div>
            {namingStatus === 'judged' ? (
              <ScoreReveal cat={found.find((f) => f.categoryIndex === namingFor.categoryIndex) ?? namingFor} />
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); submitName(); }}
                className="flex gap-2"
              >
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. sea creatures, hot drinks, types of bread…"
                  disabled={namingStatus === 'judging'}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 outline-none focus:border-fuchsia-500"
                />
                <button
                  type="submit"
                  disabled={!nameInput.trim() || namingStatus === 'judging'}
                  className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {namingStatus === 'judging' ? 'Judging…' : 'Score it'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Word grid */}
        {!done && !namingFor && (
          <div className="grid grid-cols-4 gap-2">
            {remaining.map((word) => {
              const isSel = selected.includes(word);
              const buzz = groupingStatus === 'wrong' || groupingStatus === 'oneAway';
              return (
                <button
                  key={word}
                  onClick={() => toggle(word)}
                  className={`aspect-[5/3] rounded-lg border text-sm font-semibold uppercase tracking-tight px-2 transition-all
                    ${isSel
                      ? 'bg-slate-200 border-slate-200 text-slate-950 scale-[0.98]'
                      : 'bg-slate-900 border-slate-700 text-slate-100 hover:border-slate-500'}
                    ${isSel && buzz ? 'animate-pulse' : ''}`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        )}

        {/* Grouping action row */}
        {!done && !namingFor && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Mistakes: <span className="font-mono">{'●'.repeat(MAX_MISTAKES - mistakes)}{'○'.repeat(mistakes)}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected([])}
                disabled={selected.length === 0}
                className="text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={submitGrouping}
                disabled={selected.length !== 4 || groupingStatus === 'submitting'}
                className="text-sm font-semibold bg-gradient-to-r from-fuchsia-500 to-amber-400 text-slate-950 px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {groupingStatus === 'submitting' ? '…' : 'Submit grouping'}
              </button>
            </div>
          </div>
        )}

        {/* Inline status hint */}
        {!done && (groupingStatus === 'wrong' || groupingStatus === 'oneAway') && (
          <p className="mt-3 text-center text-sm text-rose-400">
            {groupingStatus === 'oneAway' ? '🔥 One away…' : 'Not quite — try again.'}
          </p>
        )}

        {/* End state */}
        {done && (
          <EndCard
            won={won}
            found={found}
            mistakes={mistakes}
            shareString={shareString()}
            copied={copied}
            onCopy={copyShare}
          />
        )}

        <footer className="mt-12 text-center text-[11px] text-slate-500">
          A new puzzle every day, built fresh by AI · ineedadistraction
        </footer>
      </div>
    </main>
  );
}

function FoundRow({ cat, tone }: { cat: FoundCategory; tone: string }) {
  return (
    <div className={`rounded-xl border ${tone} px-3 py-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {cat.words.map((w) => (
            <span key={w} className="text-xs font-bold uppercase tracking-tight">{w}</span>
          ))}
        </div>
        {cat.score !== undefined && (
          <span className="text-xs font-mono shrink-0">{cat.score}/100</span>
        )}
      </div>
      {cat.canonical && (
        <div className="text-[11px] mt-1 opacity-80">
          {cat.guess && cat.guess.toLowerCase() !== cat.canonical.toLowerCase() ? (
            <>You: <em>{cat.guess}</em> · Answer: <strong>{cat.canonical}</strong></>
          ) : (
            <strong>{cat.canonical}</strong>
          )}
          {cat.judgeNote && <span className="ml-2 opacity-70">— {cat.judgeNote}</span>}
        </div>
      )}
    </div>
  );
}

function ScoreReveal({ cat }: { cat: FoundCategory }) {
  const score = cat.score ?? 0;
  const tone =
    score >= 90 ? 'text-emerald-300' : score >= 70 ? 'text-amber-300' : 'text-rose-300';
  const label = score >= 90 ? 'Perfect' : score >= 70 ? 'Close enough' : 'Not quite';
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className={`text-2xl font-bold ${tone}`}>{score}/100 · {label}</div>
        {cat.canonical && (
          <div className="text-xs text-slate-300 mt-1">
            We had: <strong>{cat.canonical}</strong>
            {cat.judgeNote && <span className="opacity-70"> — {cat.judgeNote}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function EndCard({
  won,
  found,
  mistakes,
  shareString,
  copied,
  onCopy,
}: {
  won: boolean;
  found: FoundCategory[];
  mistakes: number;
  shareString: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const total = found.reduce((s, c) => s + (c.score ?? 0), 0);
  const max = found.length * 100;
  return (
    <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 text-center">
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">{won ? 'Solved' : 'Out of mistakes'}</p>
      <p className="text-3xl font-extrabold mb-2">
        {total}<span className="text-slate-500">/{max}</span>
      </p>
      <p className="text-xs text-slate-400 mb-5">{mistakes} mistake{mistakes === 1 ? '' : 's'}</p>
      <pre className="text-xs whitespace-pre-wrap font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 mb-3 text-left">{shareString}</pre>
      <button
        onClick={onCopy}
        className="rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 text-slate-950 font-semibold px-5 py-2 text-sm"
      >
        {copied ? 'Copied!' : 'Copy share'}
      </button>
    </div>
  );
}
