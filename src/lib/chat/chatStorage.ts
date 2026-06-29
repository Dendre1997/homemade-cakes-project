/** sessionStorage key for guest bot history pending post-login escalate (if enabled). */
export const GUEST_CHAT_PENDING_KEY = "dk_guest_chat_pending_escalate";

/** Clears all client-side chat persistence keys. Call on logout. */
export function clearChatStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(GUEST_CHAT_PENDING_KEY);
  } catch {
    // Private browsing / blocked storage — ignore
  }
}
