// Admin allowlist — these accounts skip the waitlist takeover and land on the
// real product at /dashboard. Add Clerk user IDs here as new admins onboard.
//
// To find a Clerk user ID: sign in, then check the Clerk dashboard or
// inspect `user.id` from useUser() in the browser console.

const ADMIN_CLERK_IDS = new Set<string>([
  'user_3BJb9i5FRp4qiGLqkjDSuFFNRmp', // Sean
])

/** Returns true if the given Clerk user ID belongs to an admin. */
export function isAdmin(clerkUserId: string | null | undefined): boolean {
  if (!clerkUserId) return false
  return ADMIN_CLERK_IDS.has(clerkUserId)
}
