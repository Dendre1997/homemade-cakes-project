"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAuthStore } from "@/lib/store/authStore";

const LoginPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      await fetch("/api/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const { fetchProfile } = useAuthStore.getState();
      await fetchProfile();

      router.push("/");
    } catch (err) {
      let errorMessage = "An unknown error occurred. Please try again.";

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string };
        switch (firebaseError.code) {
          case "auth/popup-closed-by-user":
          case "auth/cancelled-popup-request":
            errorMessage = "Sign-in was cancelled. Please try again.";
            break;
          case "auth/too-many-requests":
            errorMessage =
              "Access temporarily disabled due to too many failed attempts.";
            break;
          default:
            console.error("Firebase Auth Error:", firebaseError.code);
            break;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm space-y-6">
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <Button
          id="google-signin-btn"
          type="button"
          variant="primary"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3"
        >
          {/* Google "G" logo */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isLoading ? "Signing in…" : "Continue with Google"}
        </Button>

        <p className="mt-10 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register">
            <Button variant="text">Sign up now</Button>
          </Link>
        </p>
      </div>
      {isLoading && <LoadingSpinner />}
    </div>
  );
};

export default LoginPage;
