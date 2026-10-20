"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const LIVE_INTERVAL_MS = 30_000;

type DashboardRefreshControlsProps = {
  className?: string;
};

export default function DashboardRefreshControls({
  className,
}: DashboardRefreshControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liveEnabled, setLiveEnabled] = useState(false);
  const inFlightRef = useRef(false);
  const liveEnabledRef = useRef(false);
  const lastRunAtRef = useRef(Date.now());

  useEffect(() => {
    inFlightRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    liveEnabledRef.current = liveEnabled;
  }, [liveEnabled]);

  const runRefresh = () => {
    if (inFlightRef.current) return;
    if (document.visibilityState !== "visible") return;

    inFlightRef.current = true;
    lastRunAtRef.current = Date.now();
    startTransition(() => {
      router.refresh();
    });
  };

  useEffect(() => {
    const tick = () => {
      if (!liveEnabledRef.current) return;
      runRefresh();
    };

    const onVisibilityChange = () => {
      if (
        !liveEnabledRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }
      if (Date.now() - lastRunAtRef.current >= LIVE_INTERVAL_MS) {
        runRefresh();
      }
    };

    const interval = setInterval(tick, LIVE_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return (
    <div className={cn("flex w-full items-center gap-2 sm:w-auto", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={runRefresh}
        className="gap-2 border-primary/15 bg-background/20 backdrop-blur-md"
      >
        <RefreshCw
          className={cn("h-4 w-4", isPending && "animate-spin")}
          aria-hidden
        />
        Refresh
      </Button>
      <Button
        type="button"
        variant={liveEnabled ? "primary" : "outline"}
        size="sm"
        onClick={() => setLiveEnabled((on) => !on)}
        className={cn(
          "gap-2",
          !liveEnabled && "border-primary/15 bg-background/20 backdrop-blur-md"
        )}
        aria-pressed={liveEnabled}
      >
        <Radio className="h-4 w-4" aria-hidden />
        Live
      </Button>
    </div>
  );
}
