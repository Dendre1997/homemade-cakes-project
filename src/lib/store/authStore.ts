import { create } from "zustand";
// import { User } from "firebase/auth";
import { User } from "@/types";
import { auth } from "@/lib/firebase/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  fetchProfile: async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        set({ user: null, isLoading: false });
        return;
      }
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      if (response.ok) {
        const profileData: User = await response.json();
        set({ user: profileData, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      set({ user: null, isLoading: false });
    }
  }
}));
