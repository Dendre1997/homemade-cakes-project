'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface RefreshTriggerProps {
  intervalMs?: number; // Defaults to 30000ms (30 seconds)
}

/**
 * Background RSC refresh on a fixed interval.
 * In-flight guard: skips ticks while a previous router.refresh() transition
 * is still pending (Next.js App Router — router.refresh() is void; useTransition
 * isPending is the supported completion signal).
 */
export default function RefreshTrigger({ intervalMs = 30000 }: RefreshTriggerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Ref mirrors isPending so the interval callback never reads a stale closure.
  const inFlightRef = useRef(false);

  useEffect(() => {
    inFlightRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (inFlightRef.current) {
        console.debug(
          '[RefreshTrigger] Skipping tick; previous refresh still in flight'
        );
        return;
      }

      // Mark immediately so a tick that fires before the next isPending render
      // cannot start a second overlapping refresh.
      inFlightRef.current = true;
      startTransition(() => {
        // Re-fetches the current server component data in the background
        // and re-renders the page without losing client state.
        router.refresh();
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [router, intervalMs, startTransition]);

  return null;
}
