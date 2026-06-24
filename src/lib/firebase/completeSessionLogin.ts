import { useAuthStore } from "@/lib/store/authStore";

/** Exchange Firebase ID token for HttpOnly session cookie + hydrate profile. */
export async function completeSessionLogin(idToken: string): Promise<void> {
  const res = await fetch("/api/auth/sessionLogin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    throw new Error("Failed to establish session");
  }

  await useAuthStore.getState().fetchProfile();
}
