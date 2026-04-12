"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { confirmPasswordReset } from "firebase/auth";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";

const ResetPasswordContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (!oobCode) {
      setError("Invalid or missing reset token.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccessMessage("Your password has been successfully reset! You can now log in.");
      
      // Auto redirect after a few seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to reset password. The link might be expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Create New Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please enter your new secure password below to finalize the reset.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleReset}>
          <div>
            <label
              htmlFor="password"
              className="block font-body text-small text-text-primary/80 mb-sm"
            >
              New Password
            </label>
            <div className="mt-2">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <label
              htmlFor="confirmPassword"
              className="block font-body text-small text-text-primary/80 mb-sm"
            >
              Confirm Password
            </label>
            <div className="mt-2">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {successMessage && (
            <div className="rounded-md bg-green-50 p-4 border border-green-200 text-center">
                <p className="text-sm text-green-700 font-medium">{successMessage}</p>
                <p className="text-xs text-green-600 mt-1">Redirecting to login...</p>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={isLoading || !!successMessage}
              variant="primary"
              className="flex w-full justify-center"
            >
              {isLoading ? "Saving..." : "Reset Password"}
            </Button>
          </div>
        </form>
        <p className="mt-10 text-center text-sm text-gray-500">
          Back to{" "}
          <Link href="/login">
            <Button variant="text">Sign In</Button>
          </Link>
        </p>
      </div>
      {isLoading && <LoadingSpinner />}
    </div>
  );
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><LoadingSpinner /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
