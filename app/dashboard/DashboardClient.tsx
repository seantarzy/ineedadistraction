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

function WelcomeBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-4 mb-6 flex items-center justify-between">
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
  const [showWelcome, setShowWelcome] = useState(
    searchParams.get("welcome") === "1"
  );

  useEffect(() => {
    fetch("/api/widgets")
      .then((r) => r.json())
      .then((data) => {
        setWidgets(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (sort === "mine" && isSignedIn) {
      setMyLoading(true);
      Promise.all([
        fetch("/api/widgets?filter=mine").then((r) => r.json()),
        fetch("/api/drafts").then((r) => r.json())
      ]).then(([widgets, draftData]) => {
        setMyWidgets(widgets);
        setDrafts(draftData);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-white/20 dark:border-gray-800/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent leading-tight">
              I Need a Distraction
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              Quick games. Community-made. Instant fun.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="redirect">
                <button className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all">
                  Sign In
                </button>
              </SignInButton>
            )}

            <button
              onClick={() => { trackCTAClick({ cta_text: 'Create a Game', cta_location: 'header' }); setShowCreate(true); }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              ✨ Create a Game
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {showWelcome && (
          <WelcomeBanner onDismiss={() => setShowWelcome(false)} />
        )}

        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3">
            Because everyone needs a break{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              ✨
            </span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto mb-6">
            Play community-made mini-games, vote for your favorites, or
            vibe-code your own in seconds.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => { trackCTAClick({ cta_text: 'Create a Game', cta_location: 'hero' }); setShowCreate(true); }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all"
            >
              ✨ Create a Game
            </button>
            {!isSignedIn && (
              <SignInButton mode="redirect">
                <button className="bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold px-6 py-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 transition-all">
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
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                sort === s
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-400">
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
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Sign in to see your games
              </h3>
              <p className="text-gray-400 text-sm">
                All the games you create will appear here.
              </p>
            </div>
          ) : myLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-52 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Drafts section */}
              {drafts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Drafts ({drafts.length})
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="flex flex-col gap-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{draft.emoji}</span>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm leading-tight">
                                {draft.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(draft.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                            draft
                          </span>
                        </div>
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() =>
                              router.push(
                                `/template/${draft.templateId}?draft=${draft.id}`
                              )
                            }
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
                          >
                            Continue editing →
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            disabled={deletingDraft === draft.id}
                            className="text-xs text-gray-400 hover:text-red-500 px-2 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                          >
                            {deletingDraft === draft.id ? "..." : "🗑"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Published games */}
              {myWidgets.length === 0 && drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                  <p className="text-5xl">🎮</p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    No games yet
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Create your first game and it'll show up here!
                  </p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2.5 rounded-xl"
                  >
                    ✨ Create a Game
                  </button>
                </div>
              ) : (
                myWidgets.length > 0 && (
                  <div>
                    {drafts.length > 0 && (
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        Published ({myWidgets.length})
                      </h3>
                    )}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myWidgets.map((widget) => (
                        <WidgetCard
                          key={widget.id}
                          widget={widget}
                          onPlay={(w) => router.push(`/play/${w.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-52 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
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
          <div className="mt-16 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 p-10 text-center text-white shadow-xl">
            <p className="text-4xl mb-3">🎮</p>
            <h3 className="text-2xl font-black mb-2">
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
