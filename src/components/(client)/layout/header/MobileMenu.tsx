"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, LogOut, UserCircle, Phone, PencilRuler } from "lucide-react";
import { User } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { name: string; href: string }[];
  secondaryLinks: { name: string; href: string; icon: React.ElementType }[];
  user: User | null;
  handleLogout: () => void;
}

const MobileMenu = ({
  isOpen,
  onClose,
  categories,
  secondaryLinks,
  user,
  handleLogout,
}: MobileMenuProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "auto";
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed top-0 left-0 h-full w-full max-w-sm bg-background flex flex-col z-50 transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex justify-end p-md border-b border-border">
          <button onClick={onClose} aria-label="Close menu">
            <X className="h-6 w-6 text-primary" />
          </button>
        </div>
        <nav className="flex-grow overflow-y-auto p-lg">
          <h3 className="font-heading text-h3 text-primary mb-md">
            Categories
          </h3>
          <ul className="flex flex-col w-full">
            {categories.map((link) => (
              <li key={link.href} className="w-full">
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="block w-full rounded-medium p-md font-heading text-xl text-primary hover:bg-subtleBackground transition-colors"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          <hr className="w-full my-lg border-border" />
          <ul className="flex flex-col w-full">
            {secondaryLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href} className="w-full">
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="flex items-center gap-md w-full rounded-medium p-md font-body text-lg text-primary hover:bg-subtleBackground transition-colors"
                  >
                    <Icon className="h-5 w-5 text-primary/80" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              );
            })}
            {user ? (
              <li className="w-full">
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex items-center gap-md w-full rounded-medium p-md font-body text-lg text-primary hover:bg-subtleBackground transition-colors"
                >
                  <UserCircle className="h-5 w-5 text-primary/80" />
                  <span>Profile</span>
                </Link>
              </li>
            ) : (
              <li className="w-full">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="flex items-center gap-md w-full rounded-medium p-md font-body text-lg text-primary hover:bg-subtleBackground transition-colors"
                >
                  <UserCircle className="h-5 w-5 text-primary/80" />
                  <span>Login</span>
                </Link>
              </li>
            )}
            {user && (
              <li className="w-full">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-md w-full rounded-medium p-md font-body text-lg text-error hover:bg-error/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </li>
            )}
          </ul>
          <div className="mt-xl">
            <Button variant="secondary" className="w-full">
              <PencilRuler className="h-4 w-4 mr-sm" />
              Create a Custom Cake
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default MobileMenu;
