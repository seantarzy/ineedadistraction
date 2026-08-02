import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from './prisma';

// Server-side fixed-window rate limiting for the expensive AI endpoints.
// Backed by the RateLimit table (Postgres) so it works across serverless
// invocations without any external service. The counter is bumped with a
// single atomic upsert, so concurrent requests can't race past the cap.

export type RateLimitOptions = {
  // Bucket name — combined with the caller identity to form the row key.
  name: string;
  // Max requests allowed per window.
  limit: number;
  // Window length in seconds.
  windowSec: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

// Identify the caller as fairly as we can:
//   1. Clerk userId when signed in (per-account limit)
//   2. the X-Client-Id guest cookie/header when present
//   3. the request IP (hardest to rotate for casual abuse)
// Signed-in users get a real per-user budget; anonymous callers are capped
// per IP so clearing localStorage / going incognito doesn't reset the count.
async function callerIdentity(req: Request): Promise<string> {
  try {
    const { userId } = await auth();
    if (userId) return `u:${userId}`;
  } catch {
    // auth() can throw outside a request scope — fall through to header/IP
  }
  const clientId = req.headers.get('x-client-id');
  if (clientId) return `c:${clientId}`;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return ip ? `ip:${ip}` : 'anon';
}

// Bump the counter and report whether this request is within the limit.
export async function rateLimit(req: Request, opts: RateLimitOptions): Promise<RateLimitResult> {
  const identity = await callerIdentity(req);
  const key = `${opts.name}:${identity}`;
  const nextReset = new Date(Date.now() + opts.windowSec * 1000);

  try {
    // Atomic: insert a fresh counter, or increment — resetting to 1 once the
    // window has elapsed. now() is the DB clock, so all invocations agree.
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${nextReset})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < now() THEN ${nextReset} ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt";
    `;
    const row = rows[0];
    const count = Number(row.count);
    const resetMs = new Date(row.resetAt).getTime();
    return {
      ok: count <= opts.limit,
      remaining: Math.max(0, opts.limit - count),
      retryAfterSec: Math.max(1, Math.ceil((resetMs - Date.now()) / 1000)),
    };
  } catch (err) {
    // Fail OPEN — a limiter/DB hiccup must never block a paying user from
    // generating. Abuse protection is best-effort, availability comes first.
    console.error('[rateLimit] failed, allowing request', err);
    return { ok: true, remaining: opts.limit, retryAfterSec: 0 };
  }
}

// Convenience: run a limit and, if exceeded, return a ready-made 429 response.
// Returns null when the request is allowed.
export async function enforceRateLimit(
  req: Request,
  opts: RateLimitOptions,
  message = "You're going a little fast — give it a minute and try again.",
): Promise<NextResponse | null> {
  const result = await rateLimit(req, opts);
  if (result.ok) return null;
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSec) } },
  );
}
