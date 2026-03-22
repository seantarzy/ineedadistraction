'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ConfirmHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  useEffect(() => {
    if (token) {
      router.replace(`/api/auth/confirm?token=${token}`);
    } else {
      router.replace('/');
    }
  }, [token, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-slate-900">
      <div className="text-5xl animate-bounce">🎮</div>
      <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Publishing your game...</h1>
      <p className="text-gray-400">Hold tight, this will only take a second.</p>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <ConfirmHandler />
    </Suspense>
  );
}
