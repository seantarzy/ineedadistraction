import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service · I Need a Distraction',
  description: 'The terms for using I Need a Distraction.',
};

const UPDATED = 'August 2, 2026';
const CONTACT = 'hello@ineedadistraction.com';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0612] text-purple-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-purple-300/60 hover:text-purple-100">← Back to games</Link>
        <h1 className="mt-6 font-pixel text-lg neon-text">Terms of Service</h1>
        <p className="mt-3 text-sm text-purple-300/50">Last updated: {UPDATED}</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-purple-200/80">
          <p>
            By using I Need a Distraction (&ldquo;the service&rdquo;) you agree to these terms. If you
            don&rsquo;t agree, please don&rsquo;t use the service.
          </p>

          <Section title="The service">
            <p>I Need a Distraction lets you play, create with AI, remix, and share browser mini-games. We may change or discontinue features at any time.</p>
          </Section>

          <Section title="Your account">
            <p>You&rsquo;re responsible for activity under your account and for keeping your login secure. You must be at least 13 to use the service.</p>
          </Section>

          <Section title="Acceptable use">
            <p>Don&rsquo;t use the service to create, publish, or share content that:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>is illegal, hateful, harassing, sexually explicit, or violent;</li>
              <li>infringes anyone&rsquo;s intellectual property or privacy;</li>
              <li>contains malware or attempts to harm, deceive, or exploit other users;</li>
              <li>impersonates others or misrepresents its origin.</li>
            </ul>
            <p className="mt-2">Don&rsquo;t abuse, overload, scrape, or attempt to circumvent limits on the AI generation or any other part of the service.</p>
          </Section>

          <Section title="Your content">
            <p>
              You keep ownership of the games and prompts you create. By publishing a game you grant us a
              non-exclusive, worldwide license to host, display, and share it as part of the service. You&rsquo;re
              responsible for what you create and confirm you have the right to publish it.
            </p>
          </Section>

          <Section title="Remixing">
            <p>
              A core part of the service is remixing. If you publish a game and leave remixing enabled, other
              users may build their own versions from it. You can disable remixing when you publish.
            </p>
          </Section>

          <Section title="Moderation">
            <p>
              Games are user-generated and are not pre-reviewed. We may remove content, unpublish games, or
              suspend accounts that violate these terms, at our discretion. You can report a game using the
              report link on its page.
            </p>
          </Section>

          <Section title="No warranty">
            <p>The service is provided &ldquo;as is,&rdquo; without warranties of any kind. AI-generated games may contain bugs or unexpected behavior. We don&rsquo;t guarantee it will always be available or error-free.</p>
          </Section>

          <Section title="Limitation of liability">
            <p>To the fullest extent permitted by law, we&rsquo;re not liable for any indirect, incidental, or consequential damages arising from your use of the service or from user-generated content.</p>
          </Section>

          <Section title="Termination">
            <p>You can stop using the service anytime. We may suspend or terminate accounts that violate these terms.</p>
          </Section>

          <Section title="Changes">
            <p>We may update these terms; we&rsquo;ll revise the date above. Continued use means you accept the current version.</p>
          </Section>

          <Section title="Contact">
            <p>Questions? Email <a className="text-pink-400 hover:text-pink-300" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
          </Section>
        </div>

        <p className="mt-12 text-xs text-purple-300/40">
          <Link href="/privacy" className="hover:text-purple-200">Privacy Policy</Link>
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
