import type { Metadata } from 'next';
import { getWidget } from '@/app/lib/store';
import PlayClient from './PlayClient';

const SITE_URL = 'https://ineedadistraction.com';

type RouteParams = { id: string };
type RouteSearchParams = { from?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<RouteSearchParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const { from } = await searchParams;
  const widget = await getWidget(id);

  if (!widget) {
    return {
      title: 'Game not found · I Need a Distraction',
      robots: { index: false, follow: false },
    };
  }

  const url = `${SITE_URL}/play/${id}`;
  const title = `${widget.emoji} ${widget.title}`;

  // Author-shared variant: the URL carries `?from=author` when the creator
  // copied the share link, so the iMessage / Slack / X preview card shows
  // a personal "I made this" message instead of generic copy. Pure URL-based,
  // no auth check — the author's act of sharing tags the link itself.
  const isAuthorShare = from === 'author';
  const description = isAuthorShare
    ? `Check out this game I made! ${widget.title} — built with AI in seconds. Play it free.`
    : widget.description?.trim()
      ? `${widget.description} · Play free, no signup.`
      : `Play ${widget.title} — a community-made AI mini-game. Free, no signup.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: isAuthorShare ? `🎮 Check out this game I made: ${widget.title}` : title,
      description,
      url,
      siteName: 'I Need a Distraction',
      type: 'article',
      // opengraph-image.tsx in this folder is auto-discovered as og:image —
      // no need to set images here. Next.js wires it up automatically.
    },
    twitter: {
      card: 'summary_large_image',
      title: isAuthorShare ? `🎮 Check out this game I made: ${widget.title}` : title,
      description,
    },
  };
}

export default async function PlayPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  return <PlayClient id={id} />;
}
