"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import EmailVerificationRequired from "./EmailVerificationRequired";
import LoadingSpinner from "@/components/ui/Spinner";

export default function ProfileGuard({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkVerification = async (user: any) => {
      try {
        await user.reload();
        if (mounted) setIsVerified(user.emailVerified);
      } catch (e) {
        console.error("Error reloading user:", e);
        if (mounted) setIsVerified(user.emailVerified);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkVerification(user);
      } else {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isVerified) {
    return <EmailVerificationRequired />;
  }

  return <>{children}</>;
}
