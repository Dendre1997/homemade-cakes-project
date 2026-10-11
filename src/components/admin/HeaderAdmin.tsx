"use client";

import type { RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Menu, User, LogOut, ExternalLink, Sparkles } from "lucide-react";
import { buttonVariants } from "../ui/Button";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  title: string;
  isSidebarOpen?: boolean;
  sidebarToggleRef?: RefObject<HTMLButtonElement | null>;
  onToggleCopilot?: () => void;
  isCopilotOpen?: boolean;
  copilotToggleRef?: RefObject<HTMLButtonElement | null>;
}

const AdminHeader = ({
  onToggleSidebar,
  title,
  isSidebarOpen = false,
  sidebarToggleRef,
  onToggleCopilot,
  isCopilotOpen = false,
  copilotToggleRef,
}: AdminHeaderProps) => {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {

      await signOut(auth);

      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });

      router.refresh();

      router.push("/bakery-manufacturing-orders/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <header className="w-full bg-background border-b border-border">
      <div className="flex items-center justify-between p-md">
        <div className="flex items-center gap-md">
          <button
            ref={sidebarToggleRef}
            type="button"
            onClick={onToggleSidebar}
            className="rounded-medium p-1 transition-colors hover:bg-subtleBackground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 xl:hidden"
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={isSidebarOpen}
            aria-controls="admin-navigation-sidebar"
          >
            <Menu className="h-6 w-6 text-primary" aria-hidden />
          </button>
          <h1 className="hidden sm:block font-heading text-h2 text-primary">
            {title}
          </h1>
        </div>

        {/* --- Right Side: Actions --- */}
        <div className="flex items-center gap-md">
          {onToggleCopilot && (
            <button
              ref={copilotToggleRef}
              type="button"
              onClick={onToggleCopilot}
              aria-label="Toggle Baker Copilot"
              aria-expanded={isCopilotOpen}
              aria-controls="baker-copilot-panel"
              className={cn(
                "inline-flex items-center gap-sm rounded-medium border px-sm py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                isCopilotOpen
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-primary hover:border-accent hover:text-accent"
              )}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="hidden font-body text-small sm:inline">
                Copilot
              </span>
            </button>
          )}

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink className="h-4 w-4 mr-sm" aria-hidden />
            <span>View Site</span>
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
            <Link
              href="/bakery-manufacturing-orders/login"
              className={buttonVariants({ variant: "primary" })}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
