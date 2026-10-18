'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface RefreshTriggerProps {
  intervalMs?: number; // Defaults to 30000ms (30 seconds)
}

/**
 * Background RSC refresh on a fixed interval, only while the tab is visible.
 * In-flight guard: skips ticks while a previous router.refresh() transition
 * is still pending (Next.js App Router — router.refresh() is void; useTransition
 * isPending is the supported completion signal).
 * Hidden tabs / backgrounded PWAs do not poll; on return the page catches up once,
 * but never more often than intervalMs.
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
    let lastRunAt = Date.now();

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (inFlightRef.current) {
        console.debug(
          '[RefreshTrigger] Skipping tick; previous refresh still in flight'
        );
        return;
      }

      // Mark immediately so a tick that fires before the next isPending render
      // cannot start a second overlapping refresh.
      inFlightRef.current = true;
      lastRunAt = Date.now();
      startTransition(() => {
        // Re-fetches the current server component data in the background
        // and re-renders the page without losing client state.
        router.refresh();
      });
    };

    const onVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastRunAt >= intervalMs
      ) {
        tick();
      }
    };

    const interval = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [router, intervalMs, startTransition]);

  return null;
}
