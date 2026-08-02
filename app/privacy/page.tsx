import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy · I Need a Distraction',
  description: 'How I Need a Distraction collects, uses, and protects your data.',
};

const UPDATED = 'August 2, 2026';
const CONTACT = 'hello@ineedadistraction.com';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0612] text-purple-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-purple-300/60 hover:text-purple-100">← Back to games</Link>
        <h1 className="mt-6 font-pixel text-lg neon-text">Privacy Policy</h1>
        <p className="mt-3 text-sm text-purple-300/50">Last updated: {UPDATED}</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-purple-200/80">
          <p>
            I Need a Distraction (&ldquo;we&rdquo;, &ldquo;us&rdquo;) lets you play, create, and remix
            browser mini-games. This policy explains what we collect and why. We keep it short and
            we don&rsquo;t sell your data.
          </p>

          <Section title="What we collect">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><strong className="text-purple-100">Account info.</strong> If you sign up, our auth provider (Clerk) stores your email address and login credentials.</li>
              <li><strong className="text-purple-100">Content you create.</strong> The prompts you type and the games you generate, remix, and publish.</li>
              <li><strong className="text-purple-100">Usage analytics.</strong> Via Google Analytics — pages viewed, interactions, approximate location, device and browser type. This is aggregate behavioral data, not tied to your identity beyond a random analytics ID.</li>
              <li><strong className="text-purple-100">Local storage.</strong> A random guest ID and small preferences stored in your browser so guests can keep their drafts.</li>
            </ul>
          </Section>

          <Section title="How we use it">
            <p>To run and improve the service: authenticate you, save your drafts and games, show community creations, understand what&rsquo;s used, and (if you opted in) email you about the product. That&rsquo;s it.</p>
          </Section>

          <Section title="AI generation">
            <p>
              When you create or remix a game, the prompt you submit (and the game&rsquo;s current code)
              is sent to our AI provider, Anthropic, to generate the result. Don&rsquo;t put personal or
              sensitive information in prompts.
            </p>
          </Section>

          <Section title="Who we share it with">
            <p>We use trusted service providers to operate the site, and share only what each needs to do its job:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li><strong className="text-purple-100">Clerk</strong> — authentication and account storage</li>
              <li><strong className="text-purple-100">Anthropic</strong> — AI game generation</li>
              <li><strong className="text-purple-100">Google Analytics</strong> — usage measurement</li>
              <li><strong className="text-purple-100">Vercel & Neon</strong> — hosting and database</li>
            </ul>
            <p className="mt-2">We do not sell your personal information. We may disclose information if required by law.</p>
          </Section>

          <Section title="Cookies">
            <p>We use cookies for authentication (keeping you signed in) and analytics. You can block cookies in your browser, though signing in may not work without them.</p>
          </Section>

          <Section title="Your choices">
            <p>
              You can view or delete your account and its games at any time — manage them in your
              dashboard, or email us at <a className="text-pink-400 hover:text-pink-300" href={`mailto:${CONTACT}`}>{CONTACT}</a> to
              request access to or deletion of your data.
            </p>
          </Section>

          <Section title="Children">
            <p>The service isn&rsquo;t directed at children under 13, and we don&rsquo;t knowingly collect their data.</p>
          </Section>

          <Section title="Changes">
            <p>We may update this policy; we&rsquo;ll revise the date above when we do. Continued use means you accept the current version.</p>
          </Section>

          <Section title="Contact">
            <p>Questions? Email <a className="text-pink-400 hover:text-pink-300" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
          </Section>
        </div>

        <p className="mt-12 text-xs text-purple-300/40">
          <Link href="/terms" className="hover:text-purple-200">Terms of Service</Link>
        </p>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-purple-100 font-semibold text-base mb-2">{title}</h2>
      {children}
    </section>
  );
}
