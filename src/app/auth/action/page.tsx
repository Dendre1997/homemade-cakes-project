"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import LoadingSpinner from "@/components/ui/Spinner";

const AuthActionPage = () => {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Verify the code is valid when the page loads
    if (mode === "resetPassword" && oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then(() => setIsLoading(false))
        .catch(() =>
          setError(
            "The password reset link is invalid or has expired. Please try again."
          )
        );
    } else {
      setError("Invalid action link.");
    }
  }, [mode, oobCode]);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!oobCode) return;

    setIsLoading(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      setError("Failed to reset password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="text-center py-xl">
        <h2 className="font-heading text-h2 text-error">
          Something went wrong
        </h2>
        <p className="mt-md font-body text-body text-primary/80">{error}</p>
        <div className="mt-lg">
          <Link href="/forgot-password">
            <Button variant="secondary">Request a New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-xl">
        <h2 className="font-heading text-h2 text-success">
          Password Updated! ✅
        </h2>
        <p className="mt-md font-body text-body text-primary/80">
          You can now sign in with your new password.
        </p>
        <div className="mt-lg">
          <Link href="/login">
            <Button variant="primary">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-lg py-xl">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="text-center font-heading text-h2 text-primary">
          Choose a new password
        </h2>
        <form className="mt-lg space-y-md" onSubmit={handleResetPassword}>
          <div>
            <label
              htmlFor="password"
              className="block font-body text-small text-primary/80 mb-sm"
            >
              New Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Saving..." : "Save New Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthActionPage;
