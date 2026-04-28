import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Script from 'next/script';
import DataDiveFeedback from "./components/DataDiveFeedback";
import AutoClaim from "./components/AutoClaim";
import { isAdmin } from "./lib/admin";
import "./globals.css";

const GA_ID = process.env.GOOGLE_MEASUREMENT_ID;

export const metadata: Metadata = {
  title: "I Need a Distraction",
  description: "Play community-made mini-games, vote for your favorites, or vibe-code your own in seconds.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hide the feedback widget for non-admins while the site is in fish-food
  // stage — only admins (Sean) should see it.
  const { userId } = await auth();
  const showFeedback = isAdmin(userId);

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          {children}
          <AutoClaim />
          {showFeedback && <DataDiveFeedback siteSlug="ineedadistraction" accentColor="#a855f7" />}
          {GA_ID && (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
              <Script id="ga-init" strategy="afterInteractive">{`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}</Script>
            </>
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
