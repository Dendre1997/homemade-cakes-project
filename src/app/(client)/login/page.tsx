"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      await fetch("/api/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      router.push("/");
    } catch (err) {
      let errorMessage = "An unknown error occurred. Please try again.";

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string };
        switch (firebaseError.code) {
          case "auth/user-not-found":
            errorMessage = "No account found with this email address.";
            break;

          case "auth/wrong-password":
          case "auth/invalid-credential":
            errorMessage = "Incorrect password. Please try again.";
            break;

          case "auth/too-many-requests":
            errorMessage =
              "Access temporarily disabled due to too many failed login attempts.";
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

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="email"
              className="block font-body text-small text-text-primary/80 mb-sm"
            >
              Email
            </label>
            <div className="mt-2">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block font-body text-small text-text-primary/80 mb-sm"
            >
              Password
            </label>

            <div className="mt-2">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="text-sm p-y-sm">
              <Link
                href="/forgot-password"
                className="font-semibold text-accent hover:text-subtleBackground"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="flex w-full justify-center"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
        <p className="mt-10 text-center text-sm text-gray-500">
          Don`t have an account?{" "}
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
