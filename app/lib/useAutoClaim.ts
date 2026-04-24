'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getClientId, clearClientId } from './clientId';

// Fires once per session after sign-in: if a guest clientId is still in localStorage,
// POST it to /api/claim so the user inherits any drafts they created before signing up.
export function useAutoClaim() {
  const { isSignedIn } = useAuth();
  const claimed = useRef(false);

  useEffect(() => {
    if (!isSignedIn || claimed.current) return;
    const clientId = getClientId();
    if (!clientId) return;

    claimed.current = true;
    fetch('/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.claimed > 0) {
          // Clear the clientId so we don't re-attempt the claim; future actions use userId.
          clearClientId();
        }
      })
      .catch(() => { claimed.current = false; });
  }, [isSignedIn]);
}
