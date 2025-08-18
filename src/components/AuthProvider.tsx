"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuthStore } from "@/lib/store/authStore";
import LoadingSpinner from "./Spinner";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, setUser, setIsLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); 
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
