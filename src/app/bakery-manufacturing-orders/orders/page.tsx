"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Order, OrderStatus } from "@/types";
import LoadingSpinner from "@/components/ui/Spinner";
import { useAlert } from "@/contexts/AlertContext";
import { OrdersCalendar } from "@/components/admin/orders/OrdersCalendar";
import { OrdersToolbar } from "@/components/admin/orders/OrdersToolbar";
import { OrderCard } from "@/components/admin/orders/OrderCard";
import { OrdersDayPreviewSheet } from "@/components/admin/orders/OrdersDayPreviewSheet";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { DashboardSectionHeading } from "@/components/admin/dashboard/DashboardSectionHeading";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { getBakeryToday, toDateKey, utcDayRange } from "@/lib/db/capacity";
import {
  bakeryMonthKeyFromDateKey,
  daysInBakeryMonth,
  formatBakeryDate,
  isDateKeyInBakeryWeek,
} from "@/lib/dates/bakeryCalendar";
import {
  buildOrderStatsByDateKey,
  ordersForDeliveryDateKey,
} from "@/lib/admin/orderCalendarStats";

const parseTimeSlot = (slot: string) => {
  const match = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const getOrderScheduleSortKey = (order: Order) => {
  const deliveryDates = order.deliveryInfo?.deliveryDates ?? [];

  if (deliveryDates.length === 0) {
    return {
      dateMs: Number.MAX_SAFE_INTEGER,
      timeMinutes: Number.MAX_SAFE_INTEGER,
    };
  }

  let dateMs = Number.MAX_SAFE_INTEGER;
  let timeMinutes = Number.MAX_SAFE_INTEGER;

  for (const entry of deliveryDates) {
    const key = toDateKey(entry.date);
    const entryDateMs = key
      ? new Date(`${key}T12:00:00.000Z`).getTime()
      : Number.MAX_SAFE_INTEGER;
    const entryTimeMinutes = parseTimeSlot(entry.timeSlot || "");

    if (
      entryDateMs < dateMs ||
      (entryDateMs === dateMs && entryTimeMinutes < timeMinutes)
    ) {
      dateMs = entryDateMs;
      timeMinutes = entryTimeMinutes;
    }
  }

  return { dateMs, timeMinutes };
};

const sortOrdersByDeliverySchedule = (list: Order[]) =>
  [...list].sort((a, b) => {
    const keyA = getOrderScheduleSortKey(a);
    const keyB = getOrderScheduleSortKey(b);

    if (keyA.dateMs !== keyB.dateMs) {
      return keyA.dateMs - keyB.dateMs;
    }

    return keyA.timeMinutes - keyB.timeMinutes;
  });

const ManageOrdersPage = () => {
  const { showAlert } = useAlert();
  const listRef = useRef<HTMLDivElement>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [diametersMap, setDiametersMap] = useState<Record<string, number>>({});
  const [flavorMap, setFlavorMap] = useState<Record<string, string>>({});

  const todayKey = useMemo(() => getBakeryToday(), []);
  const [monthKey, setMonthKey] = useState(() =>
    bakeryMonthKeyFromDateKey(todayKey)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    todayKey
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeScope, setTimeScope] = useState<"day" | "week" | "month">("day");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const statsByDate = useMemo(
    () => buildOrderStatsByDateKey(orders),
    [orders]
  );

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setOrders([]);

      const days = daysInBakeryMonth(monthKey);
      if (days.length === 0) return;

      const { start } = utcDayRange(days[0]);
      const { end } = utcDayRange(days[days.length - 1]);

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = (await res.json()) as Order[];
      setOrders(data);
    } catch (error) {
      console.error(error);
      showAlert("Failed to load orders", "error");
    } finally {
      setIsLoading(false);
    }
  }, [monthKey, showAlert]);

  const fetchDiameters = useCallback(async () => {
    try {
      const res = await fetch("/api/diameters");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, number> = {};
        data.forEach((d: { _id: string; sizeValue: number }) => {
          map[d._id] = d.sizeValue;
        });
        setDiametersMap(map);
      }
    } catch (error) {
      console.error("Failed to load diameters", error);
    }
  }, []);

  const fetchFlavors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/flavors");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        data.forEach((f: { _id: string; name: string }) => {
          map[f._id] = f.name;
        });
        setFlavorMap(map);
      }
    } catch (error) {
      console.error("Failed to load flavors", error);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchDiameters();
    fetchFlavors();
  }, [fetchOrders, fetchDiameters, fetchFlavors]);

  useEffect(() => {
    if (!isLoading && !hasInitialized) {
      const hasToday = statsByDate.has(todayKey);
      if (hasToday) {
        setSelectedDateKey(todayKey);
        setTimeScope("day");
      } else {
        const futureDay = daysInBakeryMonth(monthKey).find(
          (key) => key >= todayKey && statsByDate.has(key)
        );
        if (futureDay) {
          setSelectedDateKey(futureDay);
          setTimeScope("day");
        } else {
          setSelectedDateKey(todayKey);
          setTimeScope("day");
        }
      }
      setHasInitialized(true);
    }
  }, [isLoading, hasInitialized, statsByDate, todayKey, monthKey]);

  const handleMonthChange = (nextMonthKey: string) => {
    setMonthKey(nextMonthKey);
    setTimeScope("month");
    setSelectedDateKey(null);
    setPreviewOpen(false);
  };

  const handleDateSelect = (
    dateKey: string,
    _anchor?: HTMLButtonElement | null
  ) => {
    if (bakeryMonthKeyFromDateKey(dateKey) !== monthKey) {
      setMonthKey(bakeryMonthKeyFromDateKey(dateKey));
    }
    setSelectedDateKey(dateKey);
    setTimeScope("day");
    setPreviewOpen(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const oldOrders = [...orders];
    setOrders((prev) =>
      prev.map((order) =>
        order._id.toString() === orderId
          ? { ...order, status: newStatus }
          : order
      )
    );

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
    } catch (error) {
      setOrders(oldOrders);
      throw error;
    }
  };

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter === "all") {
      result = result.filter(
        (order) =>
          order.status !== OrderStatus.CANCELLED &&
          order.status !== OrderStatus.DELIVERED
      );
    } else if (statusFilter === "pending_confirmation") {
      result = result.filter(
        (order) => order.status === OrderStatus.PENDING_CONFIRMATION
      );
    } else if (statusFilter === "processing") {
      result = result.filter(
        (order) => order.status === OrderStatus.IN_PROGRESS
      );
    } else if (statusFilter === "ready") {
      result = result.filter((order) => order.status === OrderStatus.READY);
    } else if (statusFilter === "delivered") {
      result = result.filter(
        (order) => order.status === OrderStatus.DELIVERED
      );
    } else if (statusFilter === "cancelled") {
      result = result.filter(
        (order) => order.status === OrderStatus.CANCELLED
      );
    }

    if (timeScope === "day" && selectedDateKey) {
      result = result.filter((order) =>
        (order.deliveryInfo?.deliveryDates ?? []).some(
          (entry) => toDateKey(entry.date) === selectedDateKey
        )
      );
    } else if (timeScope === "week" && selectedDateKey) {
      result = result.filter((order) =>
        (order.deliveryInfo?.deliveryDates ?? []).some((entry) => {
          const key = toDateKey(entry.date);
          return key && isDateKeyInBakeryWeek(key, selectedDateKey);
        })
      );
    }

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order._id.toString().toLowerCase().includes(lowerQ) ||
          order.customerInfo.name.toLowerCase().includes(lowerQ) ||
          order.customerInfo.phone.includes(lowerQ) ||
          (order.customerInfo.email || "").toLowerCase().includes(lowerQ) ||
          (order.customerInfo.socialNickname || "")
            .toLowerCase()
            .includes(lowerQ)
      );
    }

    return sortOrdersByDeliverySchedule(result);
  }, [orders, searchQuery, statusFilter, timeScope, selectedDateKey]);

  const previewOrders = useMemo(() => {
    if (!selectedDateKey) return [];
    return sortOrdersByDeliverySchedule(
      ordersForDeliveryDateKey(orders, selectedDateKey)
    );
  }, [orders, selectedDateKey]);

  const listTitle = useMemo(() => {
    if (timeScope === "day" && selectedDateKey) {
      return `Orders · ${formatBakeryDate(selectedDateKey, {
        month: "short",
        day: "numeric",
      })}`;
    }
    if (timeScope === "week" && selectedDateKey) {
      return `Orders · week of ${formatBakeryDate(selectedDateKey, {
        month: "short",
        day: "numeric",
      })}`;
    }
    return `Orders · ${formatBakeryDate(`${monthKey}-01`, {
      month: "long",
      year: "numeric",
    })}`;
  }, [timeScope, selectedDateKey, monthKey]);

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-[1600px] space-y-6 pb-24">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">
            Orders
          </h1>
          <p className="mt-1 text-sm text-primary/70">
            Calendar shows active orders per day (not delivered or cancelled).
            America/Edmonton.
          </p>
        </div>
        <Link
          href="/bakery-manufacturing-orders/orders/new"
          className={cn(buttonVariants({ variant: "primary" }), "shrink-0")}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add order
        </Link>
      </div>

      <DashboardGlassCard>
        <OrdersCalendar
          monthKey={monthKey}
          onMonthChange={handleMonthChange}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={handleDateSelect}
          timeScope={timeScope}
          todayKey={todayKey}
          statsByDate={statsByDate}
        />
      </DashboardGlassCard>

      <div ref={listRef}>
      <DashboardGlassCard className="overflow-hidden p-0">
        <div className="border-b border-primary/10 px-4 py-4 sm:px-5">
          <DashboardSectionHeading
            title={listTitle}
            accent="none"
            action={
              <span className="rounded-full bg-background/50 px-2.5 py-1 text-sm font-medium text-primary/70">
                {filteredOrders.length}
              </span>
            }
          />
        </div>

        <OrdersToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          timeScope={timeScope}
          setTimeScope={setTimeScope}
        />

        <div className="p-4 sm:p-5">
          {filteredOrders.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-primary/60">
              <p>No orders match this view.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order._id.toString()}
                  order={order}
                  onStatusChange={handleStatusChange}
                  diametersMap={diametersMap}
                  flavorMap={flavorMap}
                />
              ))}
            </div>
          )}
        </div>
      </DashboardGlassCard>
      </div>

      <OrdersDayPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        dateKey={selectedDateKey}
        orders={previewOrders}
        onViewAll={() => {
          setTimeScope("day");
          listRef.current?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </section>
  );
};

export default ManageOrdersPage;
