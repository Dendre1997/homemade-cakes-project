'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RefreshTriggerProps {
  intervalMs?: number; // Defaults to 30000ms (30 seconds)
}

export default function RefreshTrigger({ intervalMs = 30000 }: RefreshTriggerProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      // Re-fetches the current server component data in the background
      // and re-renders the page without losing client state.
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}
