'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";
import type { Widget } from "@/app/lib/store";
import type { Draft } from "@/app/lib/drafts";
import WidgetCard from "@/app/components/WidgetCard";
import CreateModal from "@/app/components/CreateModal";
import { trackCTAClick, trackContentEngagement } from "@/app/lib/analytics";

type Sort = "trending" | "new" | "mine";

async function safeJson<T>(res: Response): Promise<T | { error?: string }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: res.ok ? 'Unexpected server response' : `Request failed with ${res.status}` };
  }
}

function WelcomeBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-4 mb-6 flex items-center justify-between neon-glow-pink">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎉</span>
        <p className="font-semibold">
          You're signed in! Create unlimited games and manage your creations.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="opacity-70 hover:opacity-100 text-lg ml-4"
      >
        ✕
      </button>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [sort, setSort] = useState<Sort>(() => {
    const tab = searchParams.get("tab");
    if (tab === "new" || tab === "mine") return tab;
    return "trending";
  });
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myWidgets, setMyWidgets] = useState<Widget[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [deletingDraft, setDeletingDraft] = useState<string | null>(null);
  const [busyWidget, setBusyWidget] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(
    searchParams.get("welcome") === "1"
  );

  useEffect(() => {
    fetch("/api/widgets")
      .then((r) => safeJson<Widget[]>(r))
      .then((data) => {
        if (Array.isArray(data)) {
          setWidgets(data);
        } else {
          const error = typeof data === 'object' && data && 'error' in data ? data.error : 'Unknown error';
          console.error("[dashboard] failed to load widgets", error);
          setWidgets([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("[dashboard] widget fetch failed", error);
        setWidgets([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (sort === "mine" && isSignedIn) {
      setMyLoading(true);
      Promise.all([
        fetch("/api/widgets?filter=mine").then((r) => safeJson<Widget[]>(r)),
        fetch("/api/drafts").then((r) => safeJson<Draft[]>(r))
      ]).then(([widgets, draftData]) => {
        setMyWidgets(Array.isArray(widgets) ? widgets : []);
        setDrafts(Array.isArray(draftData) ? draftData : []);
        setMyLoading(false);
      }).catch((error) => {
        console.error("[dashboard] mine fetch failed", error);
        setMyWidgets([]);
        setDrafts([]);
        setMyLoading(false);
      });
    }
  }, [sort, isSignedIn]);

  async function handleDeleteDraft(draftId: string) {
    setDeletingDraft(draftId);
    await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    setDeletingDraft(null);
  }

  async function handleUnpublish(widget: Widget) {
    if (!confirm(`Take "${widget.title}" off the market? You can republish anytime.`)) return;
    setBusyWidget(widget.id);
    try {
      const res = await fetch(`/api/widgets/${widget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: false }),
      });
      if (!res.ok) throw new Error("Failed");
      setMyWidgets((prev) => prev.map((w) => (w.id === widget.id ? { ...w, published: false } : w)));
    } finally {
      setBusyWidget(null);
    }
  }

  async function handleRepublish(widget: Widget) {
    setBusyWidget(widget.id);
    try {
      const res = await fetch(`/api/widgets/${widget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });
      if (!res.ok) throw new Error("Failed");
      setMyWidgets((prev) => prev.map((w) => (w.id === widget.id ? { ...w, published: true } : w)));
    } finally {
      setBusyWidget(null);
    }
  }

  async function handleDeleteWidget(widget: Widget) {
    if (!confirm(`Permanently delete "${widget.title}"? This removes the game and all its votes — can't be undone.`)) return;
    setBusyWidget(widget.id);
    try {
      const res = await fetch(`/api/widgets/${widget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setMyWidgets((prev) => prev.filter((w) => w.id !== widget.id));
    } finally {
      setBusyWidget(null);
    }
  }

  function handleTabChange(tab: Sort) {
    trackContentEngagement({ content_type: 'sort_tab', content_id: tab, engagement_type: 'interaction' });
    setSort(tab);
    const url = new URL(window.location.href);
    if (tab === "trending") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }

  const sorted = [...widgets].sort((a, b) =>
    sort === "trending" ? b.votes - a.votes : b.createdAt - a.createdAt
  );

  return (
    <div className="min-h-screen bg-[#0a0612] crt-scanlines">
      {/* Header */}
      <header className="sticky top-0 z-40 relative bg-[#0a0612]/90 backdrop-blur-md border-b border-purple-500/25">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-pixel text-[11px] sm:text-sm neon-text leading-tight tracking-wide">
              I Need a Distraction
            </h1>
            <p className="font-arcade text-sm text-purple-300/60 hidden sm:block tracking-wide">
              Brain games. Community remixes. Instant fun.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="redirect">
                <button className="text-sm font-semibold text-purple-200 hover:text-pink-300 px-3 py-2 rounded-xl hover:bg-purple-500/10 transition-all">
                  Sign In
                </button>
              </SignInButton>
            )}

            <button
              onClick={() => { trackCTAClick({ cta_text: 'Create a Game', cta_location: 'header' }); setShowCreate(true); }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-4 py-2.5 rounded-xl neon-glow-purple transition-all text-sm"
            >
              ✨ Create a Game
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 py-8">
        {showWelcome && (
          <WelcomeBanner onDismiss={() => setShowWelcome(false)} />
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="font-pixel text-lg sm:text-2xl leading-relaxed neon-text mb-4">
            Clever games for<br className="sm:hidden" /> your next break ✨
          </h2>
          <p className="font-arcade text-xl text-purple-200/70 max-w-xl mx-auto mb-6 tracking-wide">
            Play remixable brain games, vote for your favorites, or build
            your own twist in seconds.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => { trackCTAClick({ cta_text: 'Create a Game', cta_location: 'hero' }); setShowCreate(true); }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 py-3 rounded-xl neon-glow-purple transition-all"
            >
              ✨ Create a Game
            </button>
            {!isSignedIn && (
              <SignInButton mode="redirect">
                <button className="bg-[#150f24] hover:bg-purple-950/60 text-purple-100 font-bold px-6 py-3 rounded-xl border border-purple-500/40 hover:border-pink-400/60 transition-all">
                  Create Free Account
                </button>
              </SignInButton>
            )}
          </div>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(
            [
              ["trending", "🔥 Trending"],
              ["new", "🆕 New"],
              ["mine", "👤 My Games"]
            ] as [Sort, string][]
          ).map(([s, label]) => (
            <button
              key={s}
              onClick={() => handleTabChange(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                sort === s
                  ? "bg-purple-600 text-white border-purple-400 neon-glow-purple"
                  : "bg-[#150f24] text-purple-200/70 border-purple-500/20 hover:border-purple-400/50 hover:text-purple-100"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="font-arcade text-lg text-cyan-300/70 ml-auto tracking-wide">
            {sort === "mine"
              ? `${myWidgets.length} games`
              : `${widgets.length} games`}
          </span>
        </div>

        {/* Game grid */}
        {sort === "mine" ? (
          !isSignedIn ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <p className="text-5xl">🔐</p>
              <h3 className="font-pixel text-sm text-purple-100">
                Sign in to see your games
              </h3>
              <p className="text-purple-300/50 text-sm">
                All the games you create will appear here.
              </p>
            </div>
          ) : myLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-52 rounded-2xl bg-[#150f24] border border-purple-500/10 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Drafts section */}
              {drafts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-purple-300/60 uppercase tracking-wide mb-3">
                    Drafts ({drafts.length})
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {drafts.map((draft) => {
                      // Drafts whose templateId matches one of your published widgets
                      // are edit-mode sessions, not standalone remixes — resume in
                      // edit mode so save commits back to the widget instead of
                      // creating a new one.
                      const isEditDraft = myWidgets.some((w) => w.id === draft.templateId);
                      const continueUrl = isEditDraft
                        ? `/template/${draft.templateId}?edit=1&draft=${draft.id}`
                        : `/template/${draft.templateId}?draft=${draft.id}`;
                      return (
                      <div
                        key={draft.id}
                        className="flex flex-col gap-3 p-4 rounded-2xl border-2 border-dashed border-purple-500/25 bg-[#150f24]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{draft.emoji}</span>
                            <div>
                              <p className="font-bold text-purple-100 text-sm leading-tight">
                                {draft.title}
                              </p>
                              <p className="text-xs text-purple-300/40">
                                {new Date(draft.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            isEditDraft
                              ? 'bg-amber-900/30 text-amber-400 border border-amber-700/40'
                              : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/40'
                          }`}>
                            {isEditDraft ? 'editing published' : 'draft'}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => router.push(continueUrl)}
                            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
                          >
                            {isEditDraft ? 'Resume editing →' : 'Continue editing →'}
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            disabled={deletingDraft === draft.id}
                            className="text-xs text-purple-300/40 hover:text-red-400 px-2 py-2 rounded-xl hover:bg-red-900/20 transition-colors disabled:opacity-40"
                          >
                            {deletingDraft === draft.id ? "..." : "🗑"}
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const publishedMine = myWidgets.filter((w) => w.published !== false);
                const unpublishedMine = myWidgets.filter((w) => w.published === false);
                const empty = myWidgets.length === 0 && drafts.length === 0;

                if (empty) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                      <p className="text-5xl">🎮</p>
                      <h3 className="font-pixel text-sm text-purple-100">
                        No games yet
                      </h3>
                      <p className="text-purple-300/50 text-sm">
                        Create your first game and it'll show up here!
                      </p>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2.5 rounded-xl neon-glow-purple"
                      >
                        ✨ Create a Game
                      </button>
                    </div>
                  );
                }

                return (
                  <>
                    {publishedMine.length > 0 && (
                      <div>
                        {drafts.length > 0 && (
                          <h3 className="text-sm font-semibold text-purple-300/60 uppercase tracking-wide mb-3">
                            Published ({publishedMine.length})
                          </h3>
                        )}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {publishedMine.map((widget) => (
                            <div key={widget.id} className="flex flex-col gap-2">
                              <WidgetCard
                                widget={widget}
                                onPlay={(w) => router.push(`/play/${w.id}`)}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => router.push(`/template/${widget.id}?edit=1`)}
                                  className="flex-1 text-xs font-semibold text-purple-100 bg-[#150f24] border border-purple-500/30 hover:border-purple-400 rounded-xl py-2 transition-colors"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleUnpublish(widget)}
                                  disabled={busyWidget === widget.id}
                                  className="flex-1 text-xs font-semibold text-amber-400 bg-[#150f24] border border-amber-700/40 hover:border-amber-500 rounded-xl py-2 transition-colors disabled:opacity-50"
                                >
                                  {busyWidget === widget.id ? "…" : "👁️‍🗨️ Unpublish"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {unpublishedMine.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-purple-300/60 uppercase tracking-wide mb-3">
                          Unpublished ({unpublishedMine.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {unpublishedMine.map((widget) => (
                            <div
                              key={widget.id}
                              className="flex flex-col gap-3 p-4 rounded-2xl border-2 border-dashed border-amber-700/40 bg-amber-900/10"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl opacity-60">{widget.emoji}</span>
                                  <div>
                                    <p className="font-bold text-purple-100 text-sm leading-tight">
                                      {widget.title}
                                    </p>
                                    <p className="text-xs text-purple-300/40">
                                      {widget.votes} {widget.votes === 1 ? "vote" : "votes"} · hidden
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-amber-900/30 text-amber-400 border border-amber-700/40">
                                  unpublished
                                </span>
                              </div>
                              <div className="flex gap-2 mt-auto">
                                <button
                                  onClick={() => handleRepublish(widget)}
                                  disabled={busyWidget === widget.id}
                                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
                                >
                                  {busyWidget === widget.id ? "…" : "🚀 Republish"}
                                </button>
                                <button
                                  onClick={() => router.push(`/template/${widget.id}?edit=1`)}
                                  className="text-xs text-purple-300/60 hover:text-purple-200 px-3 py-2 rounded-xl border border-purple-500/20 hover:border-purple-400 transition-colors"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteWidget(widget)}
                                  disabled={busyWidget === widget.id}
                                  className="text-xs text-purple-300/40 hover:text-red-400 px-2 py-2 rounded-xl hover:bg-red-900/20 transition-colors disabled:opacity-40"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-52 rounded-2xl bg-[#150f24] border border-purple-500/10 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                onPlay={(w) => router.push(`/play/${w.id}`)}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        {!loading && (
          <div className="mt-16 rounded-3xl bg-gradient-to-br from-purple-700 to-pink-700 p-10 text-center text-white neon-glow-pink border border-pink-400/30">
            <p className="text-4xl mb-3">🎮</p>
            <h3 className="font-pixel text-base sm:text-lg mb-3">
              Build your own game. Free.
            </h3>
            <p className="text-purple-100 mb-6 max-w-md mx-auto">
              Describe any game, AI builds it in seconds. Share it, get votes,
              see it climb the charts.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => { trackCTAClick({ cta_text: 'Create a Game', cta_location: 'bottom_cta' }); setShowCreate(true); }}
                className="bg-white text-purple-700 hover:bg-purple-50 font-bold px-7 py-3 rounded-xl shadow-md transition-all"
              >
                ✨ Create a Game
              </button>
              {!isSignedIn && (
                <SignInButton mode="redirect">
                  <button className="bg-white/20 hover:bg-white/30 text-white font-bold px-7 py-3 rounded-xl transition-all border border-white/30">
                    Create Free Account
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 border-t border-purple-500/15 pt-6 pb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-purple-300/40">
          <span>© {new Date().getFullYear()} I Need a Distraction</span>
          <span className="hidden sm:inline">·</span>
          <a href="/privacy" className="hover:text-purple-200 transition-colors">Privacy</a>
          <span className="hidden sm:inline">·</span>
          <a href="/terms" className="hover:text-purple-200 transition-colors">Terms</a>
        </footer>
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

export default function DashboardClient() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
