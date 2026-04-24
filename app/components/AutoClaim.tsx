'use client';

import { useAutoClaim } from '../lib/useAutoClaim';

// Renders nothing — exists purely to run the auto-claim side effect
// at the root of the client tree.
export default function AutoClaim() {
  useAutoClaim();
  return null;
}
