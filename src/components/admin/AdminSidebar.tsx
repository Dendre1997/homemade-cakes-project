"use client";

import Link from "next/link";
import React, { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import { cn, focusWithVisibleIndicator } from "@/lib/utils";
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
  ChefHat,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  sidebarToggleRef?: React.RefObject<HTMLButtonElement | null>;
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
      { href: "/bakery-manufacturing-orders/recipes", label: "Recipes", icon: ChefHat },
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

const footerItems = [
  { href: "/bakery-manufacturing-orders/settings", label: "Settings", icon: Settings },
  { href: "/", label: "Back to Storefront", icon: Home },
];

const badgeVariants: Record<string, string> = {
  orders: "bg-accent text-white",
  custom: "bg-white/20 text-white",
  support: "bg-accent/60 text-white",
};

function useIsXlSidebarLayout() {
  const [isXl, setIsXl] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsXl(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isXl;
}

type SidebarPanelProps = {
  pathname: string;
  onClose?: () => void;
  showMobileClose: boolean;
  closeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  getBadgeCount: (badge?: string) => number;
};

function AdminSidebarPanel({
  pathname,
  onClose,
  showMobileClose,
  closeButtonRef,
  getBadgeCount,
}: SidebarPanelProps) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-md pb-sm pt-md">
        <Link
          href="/bakery-manufacturing-orders"
          onClick={onClose}
          className="group flex items-center gap-sm"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/80">
            <CakeSlice className="h-4 w-4 text-white" aria-hidden />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-lg font-semibold text-white">
              Baker Panel
            </span>
          </div>
        </Link>
        {showMobileClose && (
          <Dialog.Close asChild>
            <button
              ref={closeButtonRef}
              type="button"
              className="rounded-medium p-1 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5 text-white/70" aria-hidden />
            </button>
          </Dialog.Close>
        )}
      </div>

      <nav className="custom-scrollbar flex-1 overflow-y-auto px-sm py-sm">
        {navSections.map((section) => (
          <div key={section.label} className="mb-sm">
            <p className="px-sm pb-xs pt-sm font-body text-[10px] font-semibold uppercase tracking-widest text-white/30">
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
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-sm rounded-medium px-sm py-[7px]",
                        "font-body text-lg text-white/60 transition-colors",
                        "hover:bg-white/10 hover:text-white/90",
                        isActive && "bg-accent/25 text-white",
                      )}
                    >
                      <div className="flex items-center gap-sm">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-accent-foreground opacity-90"
                              : "text-white/40",
                          )}
                          aria-hidden
                        />
                        <span>{item.label}</span>
                      </div>

                      {badgeCount > 0 && item.badge && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-[7px] py-px text-[11px] font-bold",
                            badgeVariants[item.badge],
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

      <div className="shrink-0 border-t border-white/10 px-sm py-sm">
        {footerItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-sm rounded-medium px-sm py-[7px]",
                "font-body text-lg text-white/40 transition-colors",
                "hover:bg-white/10 hover:text-white/70",
                isActive && "text-white/80",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

const AdminSidebar = ({ isOpen, onClose, sidebarToggleRef }: SidebarProps) => {
  const pathname = usePathname();
  const isXlLayout = useIsXlSidebarLayout();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [totalCustomRequestsCount, setTotalCustomRequestsCount] = React.useState(0);
  const [newOrdersCount, setNewOrdersCount] = React.useState(0);
  const [supportChats, setSupportChats] = React.useState<any[]>([]);
  const countsInFlightRef = React.useRef(false);

  const unreadSupportCount = React.useMemo(
    () =>
      Array.isArray(supportChats)
        ? supportChats.filter((c) => c.hasUnread).length
        : 0,
    [supportChats],
  );

  const getBadgeCount = (badge?: string): number => {
    if (badge === "orders") return newOrdersCount;
    if (badge === "custom") return totalCustomRequestsCount;
    if (badge === "support") return unreadSupportCount;
    return 0;
  };

  React.useEffect(() => {
    const fetchCounts = async () => {
      if (countsInFlightRef.current) {
        console.debug(
          "[AdminSidebar] Skipping poll; previous badge-count fetch still in flight",
        );
        return;
      }

      countsInFlightRef.current = true;
      try {
        const customRes = await fetch("/api/admin/custom-orders");
        if (customRes.ok) {
          const customOrders = await customRes.json();
          const pendingCustomCount = customOrders.filter(
            (o: any) => !["converted", "rejected"].includes(o.status),
          ).length;
          setTotalCustomRequestsCount(pendingCustomCount);
        }

        const ordersRes = await fetch("/api/admin/orders");
        if (ordersRes.ok) {
          const orders = await ordersRes.json();
          if (Array.isArray(orders)) {
            const newOrderCount = orders.filter(
              (o: any) => !["delivered", "cancelled"].includes(o.status),
            ).length;
            setNewOrdersCount(newOrderCount);
          }
        }

        const supportRes = await fetch("/api/admin/chats");
        if (supportRes.ok) {
          const chats = await supportRes.json();
          if (Array.isArray(chats)) {
            setSupportChats(chats);
          }
        }
      } catch (error) {
        console.error("Failed to fetch sidebar counts", error);
      } finally {
        countsInFlightRef.current = false;
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const handleRead = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.chatId) {
        setSupportChats((prev) =>
          prev.map((c) =>
            c._id === detail.chatId ? { ...c, hasUnread: false } : c,
          ),
        );
      }
    };
    window.addEventListener("support-ticket-read", handleRead);

    if (pusherClient) {
      const channel = pusherClient.subscribe("private-admin-inbox");
      channel.bind("inbox-update", (data: any) => {
        if (data?.chatId) {
          setSupportChats((prev) => {
            if (!Array.isArray(prev)) prev = [];
            const exists = prev.some((c) => c._id === data.chatId);
            if (!exists) {
              fetch("/api/admin/chats")
                .then((res) => res.json())
                .then((chats) => {
                  if (Array.isArray(chats)) setSupportChats(chats);
                });
              return prev;
            }
            return prev.map((c) =>
              c._id === data.chatId ? { ...c, hasUnread: true } : c,
            );
          });
        } else {
          fetch("/api/admin/chats")
            .then((res) => res.json())
            .then((chats) => {
              if (Array.isArray(chats)) setSupportChats(chats);
            });
        }
      });
    }

    return () => {
      window.removeEventListener("support-ticket-read", handleRead);
      pusherClient?.channel("private-admin-inbox")?.unbind("inbox-update");
    };
  }, []);

  React.useEffect(() => {
    if (isXlLayout && isOpen) {
      onClose?.();
    }
  }, [isXlLayout, isOpen, onClose]);

  const panelProps: SidebarPanelProps = {
    pathname,
    onClose,
    getBadgeCount,
    showMobileClose: false,
  };

  const shellClassName =
    "flex h-full w-64 flex-col bg-primary text-white shadow-lg";

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full xl:flex",
          shellClassName,
        )}
        aria-label="Admin navigation"
      >
        <AdminSidebarPanel {...panelProps} />
      </aside>

      {!isXlLayout && (
        <Dialog.Root
          modal
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose?.();
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay
              className={cn(
                "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
                "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
                "data-[state=closed]:pointer-events-none",
              )}
            />
            <Dialog.Content
              id="admin-navigation-sidebar"
              aria-modal={true}
              aria-describedby={undefined}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                focusWithVisibleIndicator(closeButtonRef.current);
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                focusWithVisibleIndicator(sidebarToggleRef?.current ?? null);
              }}
              className={cn(
                shellClassName,
                "fixed left-0 top-0 z-50 outline-none",
                "transition-transform duration-300 ease-in-out",
                "data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full",
              )}
            >
              <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
              <AdminSidebarPanel
                {...panelProps}
                showMobileClose
                closeButtonRef={closeButtonRef}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
};

export default AdminSidebar;
