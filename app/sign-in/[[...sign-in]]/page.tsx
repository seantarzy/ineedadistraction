import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-slate-900 p-4">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
          I Need a Distraction
        </h1>
        <p className="text-gray-500 text-sm mt-1">Sign in to create unlimited games</p>
      </div>
      <SignIn />
    </div>
  );
}
