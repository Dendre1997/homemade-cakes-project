"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuthStore } from "@/lib/store/authStore";
import { User } from "@/types";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { fetchProfile, setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchProfile();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile, setUser, setIsLoading]);

  return <>{children}</>;
};

export default AuthProvider;
