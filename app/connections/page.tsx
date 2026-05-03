import type { Metadata } from 'next';
import ConnectionsClient from './ConnectionsClient';

const SITE_URL = 'https://ineedadistraction.com';

export const metadata: Metadata = {
  title: 'Quartet — daily AI-built word puzzle',
  description:
    'Group 16 words into 4 hidden categories. Then name the theme — the AI grades how close you got. New puzzle every day, built fresh by AI.',
  alternates: { canonical: `${SITE_URL}/connections` },
  openGraph: {
    title: 'Quartet — daily AI-built word puzzle',
    description:
      'Group the words. Name the theme. AI judges how close you got. New every day.',
    url: `${SITE_URL}/connections`,
    siteName: 'I Need a Distraction',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quartet — daily AI-built word puzzle',
    description:
      'Group the words. Name the theme. AI judges how close you got. New every day.',
  },
};

export default function ConnectionsPage() {
  return <ConnectionsClient />;
}
