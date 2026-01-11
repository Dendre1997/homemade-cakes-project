"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Menu, User, LogOut, ExternalLink } from "lucide-react";
import { Button } from "../ui/Button";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  title: string;
}

const AdminHeader = ({ onToggleSidebar, title }: AdminHeaderProps) => {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <header className="w-full bg-background border-b border-border">
      <div className="flex items-center justify-between p-md">
        <div className="flex items-center gap-md">
          <button
            onClick={onToggleSidebar}
            className="xl:hidden rounded-medium p-1 transition-colors hover:bg-subtleBackground"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6 text-primary" />
          </button>
          <h1 className="hidden sm:block font-heading text-h2 text-primary">
            {title}
          </h1>
        </div>

        {/* --- Right Side: Actions --- */}
        <div className="flex items-center gap-md">
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              <ExternalLink className="h-4 w-4 mr-sm" />
              <span>View Site</span>
            </Button>
          </Link>

          {/* Auth Status */}
          {isLoading ? (
            <div className="h-8 w-24 rounded-medium bg-border animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center gap-sm">
              <Link href="/profile" aria-label="Profile">
                <User className="h-6 w-6 text-primary transition-colors hover:text-accent" />
              </Link>
              <button onClick={handleLogout} aria-label="Logout">
                <LogOut className="h-6 w-6 text-primary transition-colors hover:text-accent" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <Button>Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
