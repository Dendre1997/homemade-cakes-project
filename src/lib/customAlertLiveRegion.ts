import type { AlertType } from "@/contexts/AlertContext";

export type CustomAlertLiveChannel = "polite" | "assertive";

export function resolveCustomAlertLiveChannel(
  type: AlertType,
): CustomAlertLiveChannel {
  return type === "error" ? "assertive" : "polite";
}

type LiveRegionElement = { textContent: string | null };

export function clearCustomAlertLiveRegions(
  politeEl: LiveRegionElement | null | undefined,
  assertiveEl: LiveRegionElement | null | undefined,
) {
  if (politeEl) politeEl.textContent = "";
  if (assertiveEl) assertiveEl.textContent = "";
}

function scheduleFrame(callback: () => void): number {
  if (typeof requestAnimationFrame !== "undefined") {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 0) as unknown as number;
}

function cancelScheduledFrame(id: number) {
  if (typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Writes message into the appropriate live region using clear → double-frame → set
 * so repeated identical text can still announce. Returns cleanup (cancel + clear target).
 */
export function scheduleCustomAlertLiveRegionText(
  politeEl: LiveRegionElement | null | undefined,
  assertiveEl: LiveRegionElement | null | undefined,
  message: string,
  type: AlertType,
): () => void {
  const channel = resolveCustomAlertLiveChannel(type);
  const target = channel === "assertive" ? assertiveEl : politeEl;
  const other = channel === "assertive" ? politeEl : assertiveEl;

  if (!target) {
    return () => {};
  }

  if (other) other.textContent = "";
  target.textContent = "";

  let cancelled = false;
  let innerFrameId = 0;

  const outerFrameId = scheduleFrame(() => {
    if (cancelled) return;
    innerFrameId = scheduleFrame(() => {
      if (cancelled) return;
      target.textContent = message;
    });
  });

  return () => {
    cancelled = true;
    cancelScheduledFrame(outerFrameId);
    if (innerFrameId) cancelScheduledFrame(innerFrameId);
    target.textContent = "";
  };
}
