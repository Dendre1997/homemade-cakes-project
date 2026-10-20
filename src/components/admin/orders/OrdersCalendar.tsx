"use client";

import { useEffect, useMemo, useRef } from "react";
import { BakeryMonthGrid } from "@/components/admin/calendar/BakeryMonthGrid";
import {
  daysInBakeryMonth,
  formatBakeryDate,
  isDateKeyInBakeryWeek,
} from "@/lib/dates/bakeryCalendar";
import {
  loadLevelFromOrderCount,
  type DayOrderStats,
} from "@/lib/admin/orderCalendarStats";
import { cn } from "@/lib/utils";

type OrdersCalendarProps = {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  selectedDateKey: string | null;
  onSelectDateKey: (
    dateKey: string,
    anchor?: HTMLButtonElement | null
  ) => void;
  timeScope: "day" | "week" | "month";
  todayKey: string;
  statsByDate: Map<string, DayOrderStats>;
};

function dayNumber(dateKey: string): string {
  return dateKey.slice(8, 10).replace(/^0/, "");
}

function loadBarWidth(level: ReturnType<typeof loadLevelFromOrderCount>): string {
  if (level === "low") return "30%";
  if (level === "medium") return "60%";
  if (level === "high") return "100%";
  return "0%";
}

function loadBarColor(level: ReturnType<typeof loadLevelFromOrderCount>): string {
  if (level === "low") return "bg-green-500";
  if (level === "medium") return "bg-amber-500";
  if (level === "high") return "bg-red-500";
  return "bg-transparent";
}

/** Active order count only — not a second numeric metric. */
function ActiveOrdersBadge({
  orderCount,
  className,
  inverted,
}: {
  orderCount: number;
  className?: string;
  inverted?: boolean;
}) {
  if (orderCount <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "leading-none",
        inverted ? "text-white/95" : "text-primary/80",
        className
      )}
      title={`${orderCount} active orders`}
    >
      <span className="font-bold tabular-nums">{orderCount}</span>{" "}
      <span className="text-[8px] font-semibold uppercase tracking-wide opacity-90">
        orders
      </span>
    </span>
  );
}

export function OrdersCalendar({
  monthKey,
  onMonthChange,
  selectedDateKey,
  onSelectDateKey,
  timeScope,
  todayKey,
  statsByDate,
}: OrdersCalendarProps) {
  const monthDays = useMemo(() => daysInBakeryMonth(monthKey), [monthKey]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedDateKey || !scrollContainerRef.current) return;
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const target = container.querySelector(
        `[data-date-key="${selectedDateKey}"]`
      ) as HTMLElement | null;
      if (!target) return;
      const scrollTo =
        target.offsetLeft -
        container.clientWidth / 2 +
        target.clientWidth / 2;
      container.scrollTo({ left: scrollTo, behavior: "smooth" });
    }, 80);
    return () => clearTimeout(timer);
  }, [selectedDateKey, monthKey]);

  const isDateActive = (dateKey: string) => {
    if (!selectedDateKey) return false;
    if (timeScope === "day") return dateKey === selectedDateKey;
    if (timeScope === "week") {
      return isDateKeyInBakeryWeek(dateKey, selectedDateKey);
    }
    return false;
  };

  const dayButtonClass = (dateKey: string, active: boolean, isExact: boolean) =>
    cn(
      "flex flex-col items-center justify-center rounded-lg text-primary transition-colors",
      active && timeScope === "day" && "bg-primary text-white shadow-md",
      active &&
        timeScope === "week" &&
        (isExact
          ? "bg-primary text-white shadow-md"
          : "bg-primary/15 font-semibold text-primary"),
      !active && "hover:bg-background/50",
      dateKey === todayKey && !active && "ring-2 ring-primary/40"
    );

  const renderGridDay = (dateKey: string) => {
    const active = isDateActive(dateKey);
    const isExact = selectedDateKey === dateKey;
    const inverted =
      (active && timeScope === "day") ||
      (active && timeScope === "week" && isExact);
    const orderCount = statsByDate.get(dateKey)?.orderCount ?? 0;

    return (
      <button
        type="button"
        data-date-key={dateKey}
        onClick={(event) => onSelectDateKey(dateKey, event.currentTarget)}
        className={cn(
          dayButtonClass(dateKey, active, isExact),
          "min-h-16 w-full gap-0.5 px-0.5 py-1"
        )}
        aria-label={
          orderCount > 0
            ? `${dateKey}, ${orderCount} active orders`
            : `${dateKey}, no active orders`
        }
      >
        <span className="text-xs font-semibold leading-none">
          {dayNumber(dateKey)}
        </span>
        <ActiveOrdersBadge
          orderCount={orderCount}
          className="text-[9px]"
          inverted={inverted}
        />
      </button>
    );
  };

  const renderStripDay = (dateKey: string) => {
    const active = isDateActive(dateKey);
    const isExact = selectedDateKey === dateKey;
    const orderCount = statsByDate.get(dateKey)?.orderCount ?? 0;
    const level = loadLevelFromOrderCount(orderCount);
    const inverted =
      (active && timeScope === "day") ||
      (active && timeScope === "week" && isExact);

    return (
      <button
        key={dateKey}
        type="button"
        data-date-key={dateKey}
        onClick={(event) => onSelectDateKey(dateKey, event.currentTarget)}
        className={cn(
          dayButtonClass(dateKey, active, isExact),
          "min-w-[4.25rem] shrink-0 snap-center gap-1 p-2"
        )}
        aria-label={
          orderCount > 0
            ? `${dateKey}, ${orderCount} active orders`
            : `${dateKey}, no active orders`
        }
      >
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wide",
            inverted ? "text-white/90" : "text-primary/60"
          )}
        >
          {formatBakeryDate(dateKey, { weekday: "short" })}
        </span>
        <span
          className={cn(
            "text-sm font-semibold leading-none",
            inverted ? "text-white" : "text-primary/80"
          )}
        >
          {dayNumber(dateKey)}
        </span>
        <ActiveOrdersBadge
          orderCount={orderCount}
          className="text-[10px]"
          inverted={inverted}
        />
        {orderCount > 0 ? (
          <div className="mt-0.5 h-1 w-full max-w-[3rem] overflow-hidden rounded-full bg-primary/10">
            <div
              className={cn("h-full rounded-full", loadBarColor(level))}
              style={{ width: loadBarWidth(level) }}
              aria-hidden
            />
          </div>
        ) : null}
      </button>
    );
  };

  const footer = (
    <p className="text-center text-xs text-primary/60">
      Date on top;{" "}
      <span className="font-medium text-primary/75">N orders</span> = active
      only (not delivered or cancelled). America/Edmonton.
    </p>
  );

  return (
    <div className="w-full">
      <div className="md:hidden">
        <BakeryMonthGrid
          monthKey={monthKey}
          onMonthChange={onMonthChange}
          renderDay={renderGridDay}
          footer={footer}
        />
      </div>

      <div className="hidden md:block">
        <BakeryMonthGrid
          monthKey={monthKey}
          onMonthChange={onMonthChange}
          renderDay={() => null}
          showGrid={false}
          footer={null}
        />
        <div
          ref={scrollContainerRef}
          className="mt-1 flex gap-1 overflow-x-auto scroll-smooth px-1 py-2 snap-x snap-mandatory"
        >
          {monthDays.map((dateKey) => renderStripDay(dateKey))}
        </div>
        {footer}
      </div>
    </div>
  );
};
