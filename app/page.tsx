import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isAdmin } from './lib/admin'
import WaitlistView from './components/WaitlistView'

// Server-rendered gate: decides admin → /dashboard before any HTML ships,
// so non-admins never see a flash of waitlist before the redirect.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>
}) {
  const { userId } = await auth()
  if (userId && isAdmin(userId)) {
    redirect('/dashboard')
  }
  const { source } = await searchParams
  return <WaitlistView source={source ?? null} isSignedIn={!!userId} />
}
