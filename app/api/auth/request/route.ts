import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createPendingAuth } from '@/app/lib/authStore';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? 'onboarding@resend.dev';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export async function POST(req: Request) {
  const { email, gameData, signInOnly } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  if (!signInOnly && (!gameData?.html || !gameData?.title)) {
    return NextResponse.json({ error: 'gameData is required when not sign-in-only' }, { status: 400 });
  }

  const token = createPendingAuth({ email, gameData: signInOnly ? null : gameData });
  const confirmUrl = `${BASE_URL}/auth/confirm?token=${token}`;

  const isGame = !signInOnly && gameData?.title;
  const subject = isGame
    ? `🎮 Your game "${gameData.title}" is ready!`
    : '🎮 Sign in to I Need a Distraction';

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: isGame
      ? gameEmailTemplate(gameData.title, confirmUrl)
      : signInEmailTemplate(confirmUrl),
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function gameEmailTemplate(title: string, confirmUrl: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8f5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:40px 32px;text-align:center;">
    <p style="margin:0;font-size:48px;">🎮</p>
    <h1 style="margin:12px 0 4px;color:#fff;font-size:24px;font-weight:800;">Your game is ready!</h1>
    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:15px;">You just vibe-coded something awesome</p>
  </div>
  <div style="padding:32px;">
    <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-weight:600;">Your game</p>
    <h2 style="margin:0 0 24px;font-size:22px;font-weight:800;color:#111;">${title}</h2>
    <p style="margin:0 0 28px;color:#6b7280;line-height:1.6;">Click below to publish your game and get a shareable link.</p>
    <a href="${confirmUrl}" style="display:block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-align:center;padding:16px;border-radius:14px;font-size:16px;font-weight:700;text-decoration:none;">🚀 View &amp; Publish My Game</a>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Link expires in 24 hours · single use</p>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;"><strong style="color:#7c3aed;">I Need a Distraction</strong> · Quick games. Community-made. Instant fun.</p>
  </div>
</div>
</body></html>`;
}

function signInEmailTemplate(confirmUrl: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8f5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:40px 32px;text-align:center;">
    <p style="margin:0;font-size:48px;">👋</p>
    <h1 style="margin:12px 0 4px;color:#fff;font-size:24px;font-weight:800;">Welcome back!</h1>
    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:15px;">Click below to sign in</p>
  </div>
  <div style="padding:32px;">
    <p style="margin:0 0 28px;color:#6b7280;line-height:1.6;">Click the button below to sign in to your I Need a Distraction account. No password needed.</p>
    <a href="${confirmUrl}" style="display:block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-align:center;padding:16px;border-radius:14px;font-size:16px;font-weight:700;text-decoration:none;">✨ Sign In</a>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Link expires in 24 hours · If you didn't request this, ignore it.</p>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;"><strong style="color:#7c3aed;">I Need a Distraction</strong> · Quick games. Community-made. Instant fun.</p>
  </div>
</div>
</body></html>`;
}
