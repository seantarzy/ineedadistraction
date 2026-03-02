import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "I Need a Distraction",
  description: "Take a quick break with brain teasers, puzzles, and fun facts!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
