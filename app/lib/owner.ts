import { auth } from '@clerk/nextjs/server';
import type { Owner } from './drafts';

// Resolve the request's owner — prefer Clerk userId when signed in, else fall back
// to the X-Client-Id header sent by guests. Returns null when neither is present.
export async function resolveOwner(req: Request): Promise<Owner | null> {
  const { userId } = await auth();
  if (userId) return { userId };
  const clientId = req.headers.get('x-client-id');
  if (clientId) return { clientId };
  return null;
}
