"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";

const AdminLoginPage = () => {
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

      const response = await fetch("/api/admin/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("Unauthorized: Admin access required.");
      }

      // Important: Push to the dashboard after successful isolated login
      window.location.href = "/bakery-manufacturing-orders";
    } catch (err) {
      let errorMessage = "An unknown error occurred. Please try again.";

      if (err instanceof Error) {
        errorMessage = err.message;
      }

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string };
        switch (firebaseError.code) {
          case "auth/user-not-found":
          case "auth/wrong-password":
          case "auth/invalid-credential":
            errorMessage = "Incorrect credentials. Please try again.";
            break;
          case "auth/too-many-requests":
            errorMessage =
              "Access temporarily disabled due to too many failed login attempts.";
            break;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900">
          Bakery Manufacturing Orders Portal
        </h2>
        <p className="text-center text-sm text-gray-500 mt-2">
          Restricted access. Please log in.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
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
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="flex w-full justify-center"
            >
              {isLoading ? "Verifying..." : "Access Dashboard"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
