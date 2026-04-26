import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.WAITLIST_ADMIN_EMAIL ?? 'seantarzy@gmail.com'
const FROM = process.env.FROM_EMAIL ?? 'ineedadistraction <onboarding@resend.dev>'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 254
}

export async function POST(req: Request) {
  let body: { email?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
  }

  // Upsert so a duplicate isn't an error — they're already on the list.
  const existed = await prisma.waitlist.findUnique({ where: { email } })
  if (!existed) {
    await prisma.waitlist.create({
      data: { email, source: body.source?.slice(0, 80) },
    })
  }

  const total = await prisma.waitlist.count()

  // Notify Sean asynchronously — don't block the response on email delivery.
  if (process.env.RESEND_API_KEY && !existed) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    resend.emails
      .send({
        from: FROM,
        to: ADMIN_EMAIL,
        subject: `New ineedadistraction waitlist signup (${total} total)`,
        text: `${email} just joined the waitlist for ineedadistraction.\n\nSource: ${body.source || '—'}\nTotal on list: ${total}`,
      })
      .catch((err) => console.error('Waitlist notify email failed:', err))
  }

  return NextResponse.json({ ok: true, alreadyOnList: !!existed, total })
}

// GET — admin listing, gated by API key
export async function GET(req: Request) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.WAITLIST_ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const entries = await prisma.waitlist.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json({ count: entries.length, entries })
}
