# ineedadistraction — Data Dive Site

This is **ineedadistraction**, an AI-powered platform for creating and remixing community mini-games. It's part of [Operation Data Dive](https://data-dive-sean-tarzys-projects.vercel.app) — Sean's cross-site analytics framework.

## Quick stats lookup

Before answering questions about traffic, engagement, or user behavior, fetch live data:
```bash
API_KEY=$(grep API_KEY ~/Development/code/data-dive/.env.local | cut -d= -f2)
curl -s -H "X-API-Key: $API_KEY" "https://data-dive-sean-tarzys-projects.vercel.app/api/status/ineedadistraction?period=7d"
```

## Site facts

- **GA4 property:** `properties/529426996` (measurement ID via `GOOGLE_MEASUREMENT_ID` env var — note: not `NEXT_PUBLIC_` prefixed)
- **Category:** interactive-tool
- **Framework:** Next.js 16 App Router, uses Clerk auth, Anthropic SDK for AI generation
- **Analytics module:** `app/lib/analytics.ts` — Tier 1 universal + interactive-tool Tier 2

## Site-specific gotchas

- Auth is via Clerk (`@clerk/nextjs`)
- AI game generation via Anthropic API in `/api/create`
- Heavy interaction tracking on `WidgetCard` (play, vote, share, remix), `CreateModal` (template selection), `template/[id]/page.tsx` (remix generation, publish)

For full Data Dive context see `~/.claude/CLAUDE.md`.
