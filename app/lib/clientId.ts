'use client';

import { useEffect, useState } from 'react';

const KEY = 'inad_client_id';

// Returns the guest clientId stored in localStorage, creating one on first call.
// Safe to call from client components only — returns null during SSR.
export function getClientId(): string | null {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function clearClientId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

// React hook: returns the clientId after hydration (null during SSR).
export function useClientId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    setId(getClientId());
  }, []);
  return id;
}
