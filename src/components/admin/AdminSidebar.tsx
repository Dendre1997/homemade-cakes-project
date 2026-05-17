"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { pusherClient } from "@/lib/pusher-client";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  PlusCircle,
  LayoutGrid,
  X,
  Calendar,
  Images,
  Database,
  SunSnow,
  BadgePercent,
  Newspaper,
  ChartNoAxesCombined,
  ClipboardList,
  Settings,
  MessageCircle,
  Home,
  CakeSlice,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

// ─── Nav structure: grouped sections ───────────────────────────────────────
const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/bakery-manufacturing-orders", label: "Dashboard", icon: LayoutDashboard },
      { href: "/bakery-manufacturing-orders/analytics", label: "Analytics", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/bakery-manufacturing-orders/orders", label: "Orders", icon: ShoppingCart, badge: "orders" },
      { href: "/bakery-manufacturing-orders/custom-orders", label: "Custom Requests", icon: ClipboardList, badge: "custom" },
      { href: "/bakery-manufacturing-orders/support", label: "Support Chat", icon: MessageCircle, badge: "support" },
      { href: "/bakery-manufacturing-orders/schedule", label: "Schedule", icon: Calendar },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/bakery-manufacturing-orders/products", label: "Products", icon: Package },
      { href: "/bakery-manufacturing-orders/catalog", label: "Inventory", icon: Database },
      { href: "/bakery-manufacturing-orders/products/create", label: "Create Product", icon: PlusCircle },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/bakery-manufacturing-orders/content", label: "Content", icon: Images },
      { href: "/bakery-manufacturing-orders/gallery", label: "Portfolio Gallery", icon: LayoutGrid },
      { href: "/bakery-manufacturing-orders/seasonals", label: "Seasonal Events", icon: SunSnow },
      { href: "/bakery-manufacturing-orders/discounts", label: "Discounts", icon: BadgePercent },
      { href: "/bakery-manufacturing-orders/blogs", label: "Blog", icon: Newspaper },
    ],
  },
];

// Pinned to the bottom, outside the scrollable nav
const footerItems = [
  { href: "/bakery-manufacturing-orders/settings", label: "Settings", icon: Settings },
  { href: "/", label: "Back to Storefront", icon: Home },
];

// Badge style variants — differentiated but all using your existing palette
const badgeVariants: Record<string, string> = {
  orders:  "bg-accent text-white",
  custom:  "bg-white/20 text-white",
  support: "bg-accent/60 text-white",
};

const AdminSidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const [totalCustomRequestsCount, setTotalCustomRequestsCount] = React.useState(0);
  const [newOrdersCount, setNewOrdersCount] = React.useState(0);
  const [supportChats, setSupportChats] = React.useState<any[]>([]);

  const unreadSupportCount = React.useMemo(
    () => supportChats.filter((c) => c.hasUnread).length,
    [supportChats]
  );

  // Helper: resolve badge count for a given badge key
  const getBadgeCount = (badge?: string): number => {
    if (badge === "orders") return newOrdersCount;
    if (badge === "custom") return totalCustomRequestsCount;
    if (badge === "support") return unreadSupportCount;
    return 0;
  };

  // ─── Data fetching ────────────────────────────────────────────────────────
  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        const customRes = await fetch("/api/admin/custom-orders");
        if (customRes.ok) {
          const customOrders = await customRes.json();
          setTotalCustomRequestsCount(customOrders.length);
        }

        const ordersRes = await fetch("/api/admin/orders");
        if (ordersRes.ok) {
          const orders = await ordersRes.json();
          const newOrderCount = orders.filter(
            (o: any) => o.status === "new" || o.status === "pending_confirmation"
          ).length;
          setNewOrdersCount(newOrderCount);
        }

        const supportRes = await fetch("/api/admin/chats");
        if (supportRes.ok) {
          const chats = await supportRes.json();
          setSupportChats(chats);
        }
      } catch (error) {
        console.error("Failed to fetch sidebar counts", error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  // ─── Real-time listeners ──────────────────────────────────────────────────
  React.useEffect(() => {
    const handleRead = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.chatId) {
        setSupportChats((prev) =>
          prev.map((c) => (c._id === detail.chatId ? { ...c, hasUnread: false } : c))
        );
      }
    };
    window.addEventListener("support-ticket-read", handleRead);

    if (pusherClient) {
      const channel = pusherClient.subscribe("private-admin-inbox");
      channel.bind("inbox-update", (data: any) => {
        if (data?.chatId) {
          setSupportChats((prev) => {
            const exists = prev.some((c) => c._id === data.chatId);
            if (!exists) {
              fetch("/api/admin/chats").then((res) => res.json()).then(setSupportChats);
              return prev;
            }
            return prev.map((c) =>
              c._id === data.chatId ? { ...c, hasUnread: true } : c
            );
          });
        } else {
          fetch("/api/admin/chats").then((res) => res.json()).then(setSupportChats);
        }
      });
    }

    return () => {
      window.removeEventListener("support-ticket-read", handleRead);
      pusherClient?.channel("private-admin-inbox")?.unbind("inbox-update");
    };
  }, []);

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-primary text-white shadow-lg transition-transform duration-300",
        "transform flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "xl:translate-x-0"
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-md pt-md pb-sm border-b border-white/10 shrink-0">
        <Link
          href="/bakery-manufacturing-orders"
          onClick={onClose}
          className="flex items-center gap-sm group"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/80 shrink-0">
            <CakeSlice className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-lg text-white font-semibold">
              Baker Panel
            </span>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="rounded-medium p-1 transition-colors hover:bg-white/20 xl:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5 text-white/70" />
        </button>
      </div>

      {/* ── Scrollable nav ──────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-sm py-sm">
        {navSections.map((section) => (
          <div key={section.label} className="mb-sm">
            {/* Section label */}
            <p className="px-sm pt-sm pb-xs text-[10px] font-semibold uppercase tracking-widest text-white/30 font-body">
              {section.label}
            </p>

            <ul className="space-y-[2px]">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const badgeCount = getBadgeCount(item.badge);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center justify-between gap-sm rounded-medium px-sm py-[7px]",
                        "font-body text-lg text-white/60 transition-colors",
                        "hover:bg-white/10 hover:text-white/90",
                        isActive && "bg-accent/25 text-white"
                      )}
                    >
                      <div className="flex items-center gap-sm">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-accent-foreground opacity-90" : "text-white/40"
                          )}
                        />
                        <span>{item.label}</span>
                      </div>

                      {/* Differentiated badges */}
                      {badgeCount > 0 && item.badge && (
                        <span
                          className={cn(
                            "text-[11px] font-bold px-[7px] py-px rounded-full shrink-0",
                            badgeVariants[item.badge]
                          )}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Pinned footer ───────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/10 px-sm py-sm">
        {footerItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-sm rounded-medium px-sm py-[7px]",
                "font-body text-lg text-white/40 transition-colors",
                "hover:bg-white/10 hover:text-white/70",
                isActive && "text-white/80"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

export default AdminSidebar;