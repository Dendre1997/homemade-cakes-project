"use client";

import { useMemo, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { BakeryMonthGrid } from "@/components/admin/calendar/BakeryMonthGrid";
import { OrderItemTiersDisplay } from "@/components/shared/OrderItemTiersDisplay";
import { Button } from "@/components/ui/Button";
import { CartItem } from "@/types";
import {
  addDaysToKey,
  getBakeryToday,
  toDateKey,
} from "@/lib/db/capacity";
import {
  bakeryMonthKeyFromDateKey,
  dateKeyToStoredDate,
  formatBakeryDate,
} from "@/lib/dates/bakeryCalendar";
import { cn } from "@/lib/utils";

type OrderAssignmentMonthCalendarProps = {
  capacityPercentages: Record<string, number>;
  adminBlockedDates: string[];
  leadTimeDays: number;
  selected?: Date | null | undefined;
  onSelect: (date: Date | undefined) => void;
  isSplitRequired?: boolean;
  popupDate?: Date | null;
  setPopupDate?: (date: Date | null) => void;
  unallocatedItems?: CartItem[];
  onAllocateItem?: (item: CartItem) => void;
  className?: string;
};

export function OrderAssignmentMonthCalendar({
  capacityPercentages,
  adminBlockedDates = [],
  leadTimeDays = 0,
  selected,
  onSelect,
  isSplitRequired = false,
  popupDate = null,
  setPopupDate,
  unallocatedItems = [],
  onAllocateItem,
  className,
}: OrderAssignmentMonthCalendarProps) {
  const todayKey = getBakeryToday();
  const firstSelectableKey = addDaysToKey(todayKey, leadTimeDays);
  const selectedKey = selected ? toDateKey(selected) : null;
  const popupKey = popupDate ? toDateKey(popupDate) : null;

  const [monthKey, setMonthKey] = useState(() =>
    bakeryMonthKeyFromDateKey(selectedKey ?? todayKey)
  );

  const adminBlockedSet = useMemo(
    () => new Set(adminBlockedDates),
    [adminBlockedDates]
  );

  const isDateDisabled = (dateKey: string) =>
    dateKey < firstSelectableKey || adminBlockedSet.has(dateKey);

  const handlePopoverOpenChange = (open: boolean, dateKey: string) => {
    if (!setPopupDate) return;
    const next = open ? dateKeyToStoredDate(dateKey) : null;
    setPopupDate(next);
    onSelect(open ? dateKeyToStoredDate(dateKey) : undefined);
  };

  const capacityClass = (capacity: number) =>
    cn(
      capacity >= 100 &&
        "bg-destructive/20 text-destructive-foreground hover:bg-destructive/30",
      capacity >= 80 &&
        capacity < 100 &&
        "bg-warning/20 text-warning-foreground hover:bg-warning/30"
    );

  const renderDayButton = (dateKey: string) => {
    const disabled = isDateDisabled(dateKey);
    const capacity = capacityPercentages[dateKey] ?? 0;
    const isSelected = selectedKey === dateKey;
    const isToday = dateKey === todayKey;
    const isPopupOpen = popupKey === dateKey;

    const dayLabel = formatBakeryDate(dateKey, { day: "numeric" });

    if (isSplitRequired && !disabled) {
      return (
        <PopoverPrimitive.Root
          open={isPopupOpen}
          onOpenChange={(open) => handlePopoverOpenChange(open, dateKey)}
        >
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              className={cn(
                "relative flex aspect-square min-h-14 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                capacityClass(capacity),
                isSelected && "ring-2 ring-primary ring-offset-1",
                !isSelected && "hover:bg-accent/10",
                !isSelected && isToday && "font-bold text-accent"
              )}
            >
              {dayLabel}
              <span className="absolute bottom-0.5 right-0.5 rounded-sm px-0.5 text-[8px] font-semibold opacity-70">
                {Math.round(capacity)}%
              </span>
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              sideOffset={5}
              className="z-50 w-64 rounded-xl border border-primary/15 bg-card p-3 shadow-md outline-none"
              align="center"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="flex-grow text-center text-sm font-semibold text-primary">
                  Assign to{" "}
                  {formatBakeryDate(dateKey, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <PopoverPrimitive.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="rounded-full p-1 hover:bg-muted"
                    onClick={() => setPopupDate?.(null)}
                  >
                    <X className="h-4 w-4 text-primary/80" />
                  </button>
                </PopoverPrimitive.Close>
              </div>
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {unallocatedItems.length > 0 ? (
                  unallocatedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-background p-2"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-bold text-primary">
                          {item.name}
                        </p>
                        <OrderItemTiersDisplay
                          tiers={item.tiers}
                          flavor={item.flavor}
                          variant="compact"
                          className="text-xs text-primary/80"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAllocateItem?.(item);
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="p-2 text-center text-sm text-primary/60">
                    No items left.
                  </p>
                )}
              </div>
              <PopoverPrimitive.Arrow className="fill-border" />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      );
    }

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(dateKeyToStoredDate(dateKey))}
        className={cn(
          "relative flex aspect-square min-h-14 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          disabled &&
            "cursor-not-allowed bg-muted/50 text-primary/40 line-through",
          !disabled && capacityClass(capacity),
          !disabled && !capacityClass(capacity) && "hover:bg-accent/10",
          !disabled && isSelected && "ring-2 ring-primary ring-offset-1",
          !disabled && !isSelected && isToday && "font-bold text-accent"
        )}
      >
        {dayLabel}
        {!disabled && (
          <span className="absolute bottom-0.5 right-0.5 rounded-sm px-0.5 text-[8px] font-semibold opacity-70">
            {Math.round(capacity)}%
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-primary/10 bg-background/20 p-3 sm:p-4",
        className
      )}
    >
      <BakeryMonthGrid
        monthKey={monthKey}
        onMonthChange={setMonthKey}
        paddingCellClassName="min-h-14"
        renderDay={(dateKey) => renderDayButton(dateKey)}
      />
    </div>
  );
}
