"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuthStore } from "@/lib/store/authStore";
import LoadingSpinner from "./ui/Spinner";
import { User } from "@/types";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setIsLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true)
      if (firebaseUser) {
        try {
          // Geting new user token
          const token = await firebaseUser.getIdToken();

          const response = await fetch("/api/profile", {
            headers: {
              // send token to check on server side
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const profileData: User = await response.json();
            setUser(profileData);
          } else {
            // Handle cases where the profile might not exist in DB yet
            setUser(null);
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setIsLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
