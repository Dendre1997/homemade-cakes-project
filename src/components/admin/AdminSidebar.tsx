"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  PlusCircle,
  Sparkles,
  Palette,
  Tag,
  Scaling,
  TriangleAlert,
  Home,
  X,
  Clock,
  Calendar,
  LayoutGrid,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products/create", label: "Create Product", icon: PlusCircle },
  { isSeparator: true },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/flavors", label: "Flavors", icon: Palette },
  { href: "/admin/decorations", label: "Decorations", icon: Sparkles },
  { href: "/admin/diameters", label: "Diameters", icon: Scaling },
  { href: "/admin/allergens", label: "Allergens", icon: TriangleAlert },
  { href: "/admin/collections", label: "Collections", icon: LayoutGrid },
  {
    href: "/admin/schedule",
    label: "Schedule Management",
    icon: Calendar,
  },
];

const AdminSidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-primary text-white shadow-lg transition-transform duration-300",
        "transform",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "xl:translate-x-0",
        "custom-scrollbar"
      )}
    >
      <div className="flex h-full flex-col p-md overflow-y-auto">
        {" "}
        <div className="flex items-center justify-between mb-lg">
          <Link href="/admin/dashboard" onClick={onClose}>
            <h1 className="font-heading text-h3 text-white">Admin Panel</h1>
          </Link>
          <button
            onClick={onClose}
            className="rounded-medium p-1 transition-colors hover:bg-white/20 xl:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        <nav className="flex-grow">
          <ul className="space-y-sm">
            {navItems.map((item, index) => {
              if ("isSeparator" in item) {
                return (
                  <hr key={`sep-${index}`} className="my-md border-white/20" />
                );
              }

              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-sm rounded-medium p-sm font-body text-body text-white/80 transition-colors",
                      "hover:bg-white/10 hover:text-white",
                      isActive && "bg-accent text-white"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto">
          <Link
            href="/"
            className="flex items-center gap-sm rounded-medium p-sm font-body text-body text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Home className="h-5 w-5 shrink-0" />
            <span>Back to Main Site</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
