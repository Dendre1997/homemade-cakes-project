"use client";

import Link from "next/link";
import React, { useRef, useSyncExternalStore } from "react";
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
  onClose: () => void;
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

const XL_SIDEBAR_QUERY = "(min-width: 1280px)";

function subscribeXlSidebarLayout(onStoreChange: () => void) {
  const mq = window.matchMedia(XL_SIDEBAR_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getXlSidebarLayoutSnapshot() {
  return window.matchMedia(XL_SIDEBAR_QUERY).matches;
}

function useIsXlSidebarLayout() {
  return useSyncExternalStore(
    subscribeXlSidebarLayout,
    getXlSidebarLayoutSnapshot,
    () => false,
  );
}

type SidebarPanelProps = {
  pathname: string;
  onClose: () => void;
  closeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  getBadgeCount: (badge?: string) => number;
};

function AdminSidebarPanel({
  pathname,
  onClose,
  closeButtonRef,
  getBadgeCount,
}: SidebarPanelProps) {
  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-md pb-sm pt-md">
        <Link
          href="/bakery-manufacturing-orders"
          onClick={onClose}
          className="group flex min-w-0 items-center gap-sm"
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
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white xl:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
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

type SidebarCounts = {
  customRequestsCount: number;
  activeOrdersCount: number;
  supportChats: { _id: string; hasUnread: boolean }[];
};

async function fetchSidebarCounts(): Promise<SidebarCounts | null> {
  const res = await fetch("/api/admin/sidebar-counts", { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as SidebarCounts;
}

const AdminSidebar = ({ isOpen, onClose, sidebarToggleRef }: SidebarProps) => {
  const pathname = usePathname();
  const isXlLayout = useIsXlSidebarLayout();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpenRef = useRef(false);
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
        const counts = await fetchSidebarCounts();
        if (counts) {
          setTotalCustomRequestsCount(counts.customRequestsCount);
          setNewOrdersCount(counts.activeOrdersCount);
          setSupportChats(counts.supportChats);
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
              fetchSidebarCounts()
                .then((counts) => {
                  if (counts) setSupportChats(counts.supportChats);
                })
                .catch(() => {});
              return prev;
            }
            return prev.map((c) =>
              c._id === data.chatId ? { ...c, hasUnread: true } : c,
            );
          });
        } else {
          fetchSidebarCounts()
            .then((counts) => {
              if (counts) setSupportChats(counts.supportChats);
            })
            .catch(() => {});
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
      onClose();
    }
  }, [isXlLayout, isOpen, onClose]);

  const isOpenRef = useRef(isOpen);
  const isXlLayoutRef = useRef(isXlLayout);
  const onCloseRef = useRef(onClose);
  isOpenRef.current = isOpen;
  isXlLayoutRef.current = isXlLayout;
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (isXlLayoutRef.current || !isOpenRef.current) return;
    onCloseRef.current();
  }, [pathname]);

  React.useEffect(() => {
    if (isXlLayout) return;

    if (isOpen) {
      focusWithVisibleIndicator(closeButtonRef.current);
    } else if (wasMobileOpenRef.current) {
      focusWithVisibleIndicator(sidebarToggleRef?.current ?? null);
    }
    wasMobileOpenRef.current = isOpen;
  }, [isOpen, isXlLayout, sidebarToggleRef]);

  React.useEffect(() => {
    if (!isOpen || isXlLayout) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isXlLayout, onClose]);

  React.useEffect(() => {
    if (isXlLayout || !isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isXlLayout]);

  const mobileDrawerClosed = !isXlLayout && !isOpen;

  return (
    <>
      {!isXlLayout && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity xl:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-navigation-sidebar"
        aria-label="Admin navigation"
        aria-hidden={mobileDrawerClosed ? true : undefined}
        inert={mobileDrawerClosed ? true : undefined}
        className={cn(
          "flex min-h-screen flex-col bg-primary text-white shadow-lg",
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out",
          !isXlLayout && (isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"),
          "xl:static xl:z-auto xl:w-64 xl:max-w-none xl:translate-x-0 xl:pointer-events-auto",
        )}
      >
        <AdminSidebarPanel
          pathname={pathname}
          onClose={onClose}
          closeButtonRef={closeButtonRef}
          getBadgeCount={getBadgeCount}
        />
      </aside>
    </>
  );
};

export default AdminSidebar;
