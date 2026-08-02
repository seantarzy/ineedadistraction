import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { enforceRateLimit } from '@/app/lib/rateLimit';

const REASONS = ['inappropriate', 'broken', 'spam', 'other'] as const;

async function reporterId(req: Request): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (userId) return `u:${userId}`;
  } catch { /* fall through */ }
  const clientId = req.headers.get('x-client-id');
  if (clientId) return `c:${clientId}`;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return ip ? `ip:${ip}` : null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Cap reports per caller so the report flow itself can't be used to spam us.
  const limited = await enforceRateLimit(
    req,
    { name: 'report', limit: 20, windowSec: 3600 },
    'Too many reports — try again later.',
  );
  if (limited) return limited;

  let body: { reason?: string; details?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const reason = REASONS.includes(body.reason as typeof REASONS[number]) ? body.reason! : 'other';
  const details = typeof body.details === 'string' ? body.details.slice(0, 500) : '';
  const fullReason = details ? `${reason}: ${details}` : reason;

  try {
    await prisma.report.create({
      data: { widgetId: id, reason: fullReason, reporter: await reporterId(req) },
    });
  } catch (err) {
    console.error('[api/report] failed', err);
    return NextResponse.json({ error: 'Could not submit report' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
