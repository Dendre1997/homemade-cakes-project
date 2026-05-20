"use client";
import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import LoadingSpinner from "@/components/ui/Spinner";

const provider = new GoogleAuthProvider();
// Request profile & email scopes (default) — no extra scopes needed
provider.setCustomParameters({ prompt: "select_account" });

const AdminLoginPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Google via Firebase on the client
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      // 2. Pass the raw Firebase ID token to the backend for server-side validation
      const response = await fetch("/api/admin/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (response.status === 403) {
        // Explicit 403 means authenticated but not an authorised admin — do not leak details
        setError("Access denied. This account is not authorised to access the admin portal.");
        return;
      }

      if (!response.ok) {
        throw new Error("Authentication failed. Please try again.");
      }

      // 3. Hard redirect to prevent stale client-side state from leaking into the admin context
      window.location.href = "/bakery-manufacturing-orders";
    } catch (err) {
      // Firebase client-side errors (popup closed, network, etc.)
      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string };
        if (firebaseError.code === "auth/popup-closed-by-user" || firebaseError.code === "auth/cancelled-popup-request") {
          // User dismissed the popup — not an error worth surfacing
          return;
        }
        if (firebaseError.code === "auth/too-many-requests") {
          setError("Too many sign-in attempts. Please wait a moment and try again.");
          return;
        }
      }
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900">
          Bakery Manufacturing Orders Portal
        </h2>
        <p className="text-center text-sm text-gray-500 mt-2">
          Restricted access. Authorised personnel only.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        {error && (
          <div className="mb-6 bg-red-50 p-3 rounded-lg border border-red-100">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <button
          id="google-sign-in-btn"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Google "G" SVG logo */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default AdminLoginPage;
