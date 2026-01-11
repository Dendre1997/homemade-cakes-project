// src/components/admin/OrderAssignmentDatePicker.tsx
"use client";
import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartItem } from "@/types";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Button } from "@/components/ui/Button";

interface OrderAssignmentDatePickerProps {
  // Data for display
  capacityPercentages: Record<string, number>; // {"YYYY-MM-DD": percentage}
  adminBlockedDates: string[]; // ["YYYY-MM-DD"]
  leadTimeDays: number;

  // State & Handlers from parent
  selected?: Date | null | undefined; // Date selected in simple mode OR date triggering popover
  onSelect: (date: Date | undefined) => void; // Called in simple mode OR when opening popover

  // Props for Split Mode / Popover Logic
  isSplitRequired?: boolean; // Controls if popover logic is active
  popupDate?: Date | null; // The date for which the popover is currently open
  setPopupDate?: (date: Date | null) => void; // Function to control popover open state
  unallocatedItems?: CartItem[]; // Items to display in the popover
  onAllocateItem?: (item: CartItem) => void; // Callback when 'Assign' is clicked in popover
}

export const OrderAssignmentDatePicker = ({
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
}: OrderAssignmentDatePickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  // Calendar grid calculations (Standard)
  const firstDay = startOfMonth(currentMonth);
  const lastDay = endOfMonth(currentMonth);
  const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
  const endDate = endOfWeek(lastDay, { weekStartsOn: 1 });
  const daysInGrid = eachDayOfInterval({ start: startDate, end: endDate });
  const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Navigation Handlers
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Derived Values
  const firstAvailableDate = startOfDay(addDays(new Date(), leadTimeDays));
  const adminBlockedSet = useMemo(
    () => new Set(adminBlockedDates),
    [adminBlockedDates]
  );

  // Handler for Popover open state (Syncs with parent state)
  const handlePopoverOpenChange = (open: boolean, day: Date) => {
    if (setPopupDate) {
      const newPopupDate = open ? day : null;
      setPopupDate(newPopupDate);

      // Notify parent about the selection change (for highlighting)
      if (onSelect) {
        // Pass the date that was clicked to sync the parent's 'selected' state
        onSelect(open ? day : undefined);
      }
    }
  };

  return (
    <div className="w-full bg-card p-lg rounded-large shadow-md">
      {/* --- Navigation Header --- */}
      <div className="relative flex items-center justify-center pt-2 pb-4">
        <h2 className="font-heading text-lg text-primary">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="absolute inset-0 flex items-center justify-between">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="p-sm rounded-full transition-colors hover:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Go to previous month"
          >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-sm rounded-full transition-colors hover:bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Go to next month"
          >
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>
        </div>
      </div>

      {/* --- Calendar Grid --- */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday Headers */}
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center font-body text-small text-primary/60 pb-sm"
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {daysInGrid.map((day, i) => {
          const dayString = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selected ? isSameDay(selected, day) : false;
          const isDisabled =
            day < firstAvailableDate || adminBlockedSet.has(dayString);
          const capacity = capacityPercentages[dayString] ?? 0;
          const isPopupOpenForThisDay = popupDate
            ? isSameDay(popupDate, day)
            : false;

          return (
            <div
              key={i}
              className="flex items-center justify-center aspect-square"
            >
              {/* --- CONDITION: Render Popover trigger if in split mode AND date is valid --- */}
              {isSplitRequired && !isDisabled && isCurrentMonth ? (
                <PopoverPrimitive.Root
                  open={isPopupOpenForThisDay}
                  onOpenChange={(open) => handlePopoverOpenChange(open, day)}
                >
                  <PopoverPrimitive.Trigger asChild>
                    {/* Day Button acts as the Popover Trigger */}
                    <button
                      type="button"
                      disabled={!isCurrentMonth}
                      className={cn(
                        "relative flex h-full w-full items-center justify-center rounded-medium font-body transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        "text-sm",
                        capacity >= 100 &&
                          "bg-destructive/20 text-destructive-foreground hover:bg-destructive/30",
                        capacity >= 80 &&
                          capacity < 100 &&
                          "bg-warning/20 text-warning-foreground hover:bg-warning/30",
                        isSelected && "ring-2 ring-primary ring-offset-1",
                        !isSelected && "hover:bg-accent/10",
                        !isSelected && isToday(day) && "font-bold text-accent"
                      )}
                    >
                      {format(day, "d")}
                      {/* Capacity Percentage Display */}
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-semibold opacity-70 px-0.5 rounded-sm">
                        <span
                          className={cn(
                            capacity >= 100 && "text-destructive-foreground/90",
                            capacity >= 80 &&
                              capacity < 100 &&
                              "text-warning-foreground/90",
                            capacity < 80 && "text-primary/60"
                          )}
                        >
                          {Math.round(capacity)}%
                        </span>
                      </span>
                    </button>
                  </PopoverPrimitive.Trigger>

                  {/* --- Popover Content (for split mode) --- */}
                  <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content
                      sideOffset={5}
                      className="z-50 w-64 rounded-medium border bg-card p-sm shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                      align="center"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      {/* Popover Header */}
                      <div className="flex justify-between items-center mb-xs">
                        <p className="font-body text-small font-semibold text-center flex-grow text-primary">
                          Assign to {format(day, "MMM d")}
                        </p>
                        <PopoverPrimitive.Close asChild>
                          <button
                            aria-label="Close"
                            className="p-1 rounded-full hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                            onClick={() => setPopupDate?.(null)}
                          >
                            <X className="h-4 w-4 text-primary/80" />
                          </button>
                        </PopoverPrimitive.Close>
                      </div>
                      {/* Scrollable list container */}
                      <div className="space-y-sm max-h-60 overflow-y-auto pr-sm">
                        {unallocatedItems && unallocatedItems.length > 0 ? (
                          unallocatedItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-xs bg-background rounded-small"
                            >
                              <div>
                                <p className="font-body text-small font-bold text-primary">
                                  {item.name}
                                </p>
                                <p className="font-body text-xs text-primary/80">
                                  {item.flavor}
                                </p>
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
                          <p className="font-body text-small text-center text-primary/60 p-sm">
                            No items left.
                          </p>
                        )}
                      </div>
                      <PopoverPrimitive.Arrow className="fill-border" />
                    </PopoverPrimitive.Content>
                  </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
              ) : (
                /* --- Standard Day Button (Simple Mode or Disabled/Outside Month) --- */
                <button
                  type="button"
                  onClick={() => onSelect(day)} // Simple selection
                  disabled={!isCurrentMonth || isDisabled}
                  className={cn(
                    "relative flex h-full w-full items-center justify-center rounded-medium font-body transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                    "text-sm",
                    !isCurrentMonth &&
                      "text-primary/30 opacity-60 pointer-events-none",
                    isDisabled &&
                      "text-primary/40 line-through cursor-not-allowed bg-muted/50",
                    !isDisabled && isCurrentMonth && "hover:bg-accent/10",
                    !isDisabled &&
                      isCurrentMonth &&
                      capacity >= 100 &&
                      "bg-destructive/20 text-destructive-foreground hover:bg-destructive/30",
                    !isDisabled &&
                      isCurrentMonth &&
                      capacity >= 80 &&
                      capacity < 100 &&
                      "bg-warning/20 text-warning-foreground hover:bg-warning/30",
                    !isDisabled &&
                      isSelected &&
                      "ring-2 ring-primary ring-offset-1",
                    !isSelected &&
                      !isDisabled &&
                      isToday(day) &&
                      "font-bold text-accent"
                  )}
                >
                  {/* Day number */}
                  {format(day, "d")}
                  {/* Capacity Percentage Display (only if available) */}
                  {!isDisabled && isCurrentMonth && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-semibold opacity-70 px-0.5 rounded-sm">
                      <span
                        className={cn(
                          capacity >= 100 && "text-destructive-foreground/90",
                          capacity >= 80 &&
                            capacity < 100 &&
                            "text-warning-foreground/90",
                          capacity < 80 && "text-primary/60"
                        )}
                      >
                        {Math.round(capacity)}%
                      </span>
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
