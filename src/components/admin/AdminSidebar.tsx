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
  Home,
  X,
  Calendar,
  Images,
  Database,
  SunSnow,
  BadgePercent,
  Newspaper,
  ChartNoAxesCombined,
  Inbox,
  ClipboardList,
  Settings 
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}



const navItems = [
  { href: "/bakery-manufacturing-orders/", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/bakery-manufacturing-orders/custom-orders",
    label: "Custom Requests",
    icon: ClipboardList,
  },
  { href: "/bakery-manufacturing-orders/products", label: "Products", icon: Package },
  { href: "/bakery-manufacturing-orders/orders", label: "Orders", icon: ShoppingCart },
  { href: "/bakery-manufacturing-orders/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/bakery-manufacturing-orders/products/create", label: "Create Product", icon: PlusCircle },
  { isSeparator: true },
  {
    label: "Catalog/Inventory",
    href: "/bakery-manufacturing-orders/catalog",
    icon: Database,
  },
  {
    href: "/bakery-manufacturing-orders/content",
    label: "Content",
    icon: Images,
  },
  {
    href: "/bakery-manufacturing-orders/schedule",
    label: "Schedule Management",
    icon: Calendar,
  },
  {
    href: "/bakery-manufacturing-orders/seasonals",
    label: "Seasonal Events",
    icon: SunSnow,
  },
  {
    href: "/bakery-manufacturing-orders/discounts",
    label: "Discounts",
    icon: BadgePercent,
  },
  {
    href: "/bakery-manufacturing-orders/blogs",
    label: "Your Blog",
    icon: Newspaper,
  },
  {
    href: "/bakery-manufacturing-orders/settings",
    label: "Settings",
    icon: Settings,
  },
];



const AdminSidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const [newCustomRequestsCount, setNewCustomRequestsCount] = React.useState(0);
  const [newOrdersCount, setNewOrdersCount] = React.useState(0);

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        // 1. Custom Orders
        const customRes = await fetch("/api/custom-orders");
        if (customRes.ok) {
          const customOrders = await customRes.json();
          const newCustomCount = customOrders.filter((o: any) => o.status === 'new').length;
          setNewCustomRequestsCount(newCustomCount);
        }

        // 2. Regular Orders
        const ordersRes = await fetch("/api/admin/orders");
        if (ordersRes.ok) {
            const orders = await ordersRes.json();
            // Count "new" and "pending_confirmation" as actionable
            const newOrderCount = orders.filter((o: any) => 
                o.status === 'new' || o.status === 'pending_confirmation'
            ).length;
            setNewOrdersCount(newOrderCount);
        }

      } catch (error) {
        console.error("Failed to fetch sidebar counts", error);
      }
    };

    fetchCounts();
    // Optional: Poll every 60s
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

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
          <Link href="/bakery-manufacturing-orders/" onClick={onClose}>
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
                      "flex items-center justify-between gap-sm rounded-medium p-sm font-body text-body text-white/80 transition-colors",
                      "hover:bg-white/10 hover:text-white",
                      isActive && "bg-accent text-white"
                    )}
                  >
                    <div className="flex items-center gap-sm">
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </div>

                    {/* Badges */}
                    {item.label === "Custom Requests" &&
                      newCustomRequestsCount > 0 && (
                        <span className="bg-accent text-white  text-[15px] font-bold px-2 rounded-full shadow-sm">
                          {newCustomRequestsCount}
                        </span>
                      )}
                    {item.label === "Orders" && newOrdersCount > 0 && (
                      <span className="bg-accent text-white text-[15px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {newOrdersCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;
