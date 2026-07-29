import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0a0612] crt-scanlines p-4">
      <div className="relative text-center mb-2">
        <h1 className="font-pixel text-sm sm:text-base neon-text">
          I Need a Distraction
        </h1>
        <p className="font-arcade text-lg text-purple-300/60 mt-2 tracking-wide">Sign in to create unlimited games</p>
      </div>
      <div className="relative">
        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#a855f7',
              colorBackground: '#150f24',
              colorText: '#f4f0ff',
              colorTextSecondary: '#c4b5fd99',
              colorInputBackground: '#0a0612',
              colorInputText: '#f4f0ff',
              borderRadius: '0.75rem',
            },
            elements: {
              card: 'border border-purple-500/30 shadow-[0_0_28px_rgba(168,85,247,0.2)]',
              headerTitle: '!text-purple-50',
              headerSubtitle: '!text-purple-300',
              dividerText: '!text-purple-300',
              dividerLine: '!bg-purple-500/25',
              formFieldLabel: '!text-purple-200',
              socialButtonsBlockButtonText: '!text-purple-50',
              footerActionText: '!text-purple-300',
              footerActionLink: '!text-pink-400 hover:!text-pink-300',
              identityPreviewText: '!text-purple-100',
              identityPreviewEditButton: '!text-pink-400',
              footer: '!bg-transparent',
            },
          }}
        />
      </div>
    </div>
  );
}
