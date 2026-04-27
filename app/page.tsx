'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useUser, SignInButton } from '@clerk/nextjs'
import { isAdmin } from './lib/admin'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function WaitlistPage() {
  return (
    <Suspense>
      <WaitlistInner />
    </Suspense>
  )
}

function WaitlistInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [count, setCount] = useState<number | null>(null)

  // ?source=remix means the visitor clicked Remix on a shared game and got
  // funneled here because they're not on the alpha. Show a remix-flavored pitch.
  const source = searchParams.get('source')
  const isRemixSource = source === 'remix'

  // Admin bypass — signed-in admins skip the waitlist and land on the real app.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return
    if (isAdmin(user.id)) router.replace('/dashboard')
  }, [isLoaded, isSignedIn, user, router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting' || !email.trim()) return
    setStatus('submitting')
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: source || 'home' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setStatus('error')
        return
      }
      setCount(data.total ?? null)
      setStatus('success')
    } catch {
      setError('Network error — try again?')
      setStatus('error')
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0a0612] text-white">
      <FloatingTiles />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-purple-300">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
          {isRemixSource ? 'remixing opens spring ’26' : 'early access · spring ’26'}
        </div>

        {isRemixSource ? (
          <>
            <h1 className="text-center text-5xl font-extrabold tracking-tight md:text-7xl">
              You can remix this.
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-300 bg-clip-text text-transparent">
                Just not quite yet.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-center text-base leading-relaxed text-slate-300 md:text-lg">
              Drop your email and we&rsquo;ll let you in the moment doors open.
              Remix any game, publish your spin, and earn when players love it.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-center text-5xl font-extrabold tracking-tight md:text-7xl">
              The AI playground
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-300 bg-clip-text text-transparent">
                for games that don&rsquo;t exist yet.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-center text-base leading-relaxed text-slate-300 md:text-lg">
              Describe a game. AI builds it in 60 seconds. Friends remix it.
              The good ones get played thousands of times.
            </p>
          </>
        )}

        {status === 'success' ? (
          <div className="mt-12 max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <div className="text-4xl">🎉</div>
            <h2 className="mt-3 text-xl font-semibold">You&rsquo;re in.</h2>
            <p className="mt-2 text-sm text-slate-300">
              We&rsquo;ll email you the moment doors open.
              {count !== null && (
                <>
                  <br />
                  You&rsquo;re #{count} on the list.
                </>
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-12 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@somewhere.com"
              disabled={status === 'submitting'}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status === 'submitting' || !email.trim()}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 text-base font-semibold shadow-lg shadow-purple-500/20 transition-all hover:from-purple-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'submitting' ? 'Adding…' : 'Get early access'}
            </button>
          </form>
        )}

        {error && status === 'error' && (
          <p className="mt-3 text-sm text-rose-400">{error}</p>
        )}

        <ul className="mt-16 grid max-w-2xl grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <Feature
            icon="🏎️"
            title="Math Quiz Racer"
            body="Get the answer right, your car flies. Wrong, you stall. The first game we&rsquo;re shipping."
          />
          <Feature
            icon="✨"
            title="Build in 60 seconds"
            body="Describe what you want. AI writes the code. You hit play."
          />
          <Feature
            icon="💸"
            title="Earn from hits"
            body="When players love your game, you get paid. Coming after launch."
          />
        </ul>

        <p className="mt-16 text-center text-xs text-slate-500">
          ineedadistraction · cooking · don&rsquo;t tell everyone yet
        </p>

        {/* Discreet admin sign-in — just a small link, doesn't compete with the
            email CTA. Admins go through here, get redirected to /dashboard. */}
        <div className="mt-4 text-center text-[11px] text-slate-600">
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <button className="underline-offset-2 hover:text-slate-300 hover:underline">
                team sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </main>
  )
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-400">{body}</div>
    </li>
  )
}

// Decorative — subtle floating "game tiles" in the background suggesting
// the platform's vibe without revealing actual game content.
function FloatingTiles() {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  const tiles = [
    { left: '8%', top: '14%', size: 56, delay: 0, hue: 'from-purple-500/20 to-pink-500/10' },
    { left: '85%', top: '18%', size: 72, delay: 1.2, hue: 'from-orange-500/20 to-pink-500/10' },
    { left: '12%', top: '72%', size: 48, delay: 0.6, hue: 'from-blue-500/20 to-purple-500/10' },
    { left: '78%', top: '78%', size: 64, delay: 1.8, hue: 'from-pink-500/20 to-orange-500/10' },
    { left: '50%', top: '8%', size: 40, delay: 2.4, hue: 'from-emerald-500/20 to-blue-500/10' },
    { left: '92%', top: '50%', size: 36, delay: 3.0, hue: 'from-pink-500/20 to-purple-500/10' },
  ]
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {tiles.map((t, i) => (
        <div
          key={i}
          className={`absolute rounded-2xl bg-gradient-to-br ${t.hue} animate-float blur-[2px]`}
          style={{
            left: t.left,
            top: t.top,
            width: t.size,
            height: t.size,
            animationDelay: `${t.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-14px) rotate(3deg); }
        }
        :global(.animate-float) {
          animation: float 7s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
