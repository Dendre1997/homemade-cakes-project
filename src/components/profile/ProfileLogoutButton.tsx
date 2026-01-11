"use client";

import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/authStore"; 

export default function ProfileLogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore(); // Clear client store

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      
      setUser(null);

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
        variant="danger" 
        size="sm" 
        onClick={handleLogout}
        disabled={isLoading}
        className="gap-2"
    >
        <LogOut className="w-4 h-4" />
        {isLoading ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
