import { auth } from "@/lib/firebase/client";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type UserCredential,
} from "firebase/auth";

function isFirebaseAuthError(err: unknown): err is { code: string } {
  return !!err && typeof err === "object" && "code" in err;
}

/**
 * Opens Google OAuth via popup. Falls back to full-page redirect when the
 * browser blocks popups (`auth/popup-blocked`).
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();

  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    if (isFirebaseAuthError(err) && err.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      // Page navigates away; this promise never settles in the current document.
      return new Promise(() => {});
    }
    throw err;
  }
}

/** Call on auth pages after redirect-based Google sign-in. */
export async function getGoogleRedirectSignInResult(): Promise<UserCredential | null> {
  return getRedirectResult(auth);
}

export function getFirebaseAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled. Please try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site, or wait while we redirect you to Google.";
    case "auth/too-many-requests":
      return "Access temporarily disabled due to too many failed attempts.";
    default:
      return "Failed to sign in with Google. Please try again.";
  }
}

export function shouldLogFirebaseAuthError(code: string): boolean {
  return ![
    "auth/popup-closed-by-user",
    "auth/cancelled-popup-request",
    "auth/popup-blocked",
  ].includes(code);
}
