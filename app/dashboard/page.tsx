import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/app/lib/admin';
import DashboardClient from './DashboardClient';

// Server-rendered gate: non-admins (signed-out or signed-in) bounce to /
// before any HTML ships, so there's no "Checking access…" flash.
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId || !isAdmin(userId)) {
    redirect('/');
  }
  return <DashboardClient />;
}
