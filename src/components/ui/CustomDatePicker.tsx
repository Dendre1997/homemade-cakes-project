"use client";
import { X } from "lucide-react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartItem, UniqueCartItem } from "@/types";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Button } from "@/components/ui/Button";

interface CustomDatePickerProps {
  selected?: Date;
  onSelect?: (date?: Date) => void;
  unavailableDates?: string[];
  leadTimeDays?: number;
  suggestionDates?: string[];
  isSplitRequired?: boolean;
  popupDate?: Date | null;
  setPopupDate?: (date: Date | null) => void;
  unallocatedItems?: UniqueCartItem[];
  onAllocateItem?: (item: UniqueCartItem) => void;
}

const CustomDatePicker = ({
  selected,
  onSelect,
  unavailableDates = [],
  leadTimeDays = 0,
  suggestionDates = [],
  isSplitRequired = false,
  popupDate = null,
  setPopupDate,
  unallocatedItems = [],
  onAllocateItem,
}: CustomDatePickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const unavailableDateStrings = useMemo(() => {
    return new Set(unavailableDates);
  }, [unavailableDates]);

  const suggestionTimestamps = useMemo(() => {
    return new Set(
      suggestionDates.map((dateString) => {
        return startOfDay(new Date(dateString)).getTime();
      })
    );
  }, [suggestionDates]);

  const firstDay = startOfMonth(currentMonth);
  const lastDay = endOfMonth(currentMonth);
  const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
  const endDate = endOfWeek(lastDay, { weekStartsOn: 1 });
  const daysInGrid = eachDayOfInterval({ start: startDate, end: endDate });
  const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const firstAvailableDate = startOfDay(addDays(new Date(), leadTimeDays));

  const handlePopoverOpenChange = (open: boolean, day: Date) => {
    if (setPopupDate) {
      setPopupDate(open ? day : null);
      if (open && onSelect) {
        onSelect(day);
      }
    }
  };

  return (
    <div className="w-full bg-card-background p-lg rounded-large shadow-md">
      <div className="relative flex items-center justify-center pt-2 pb-4">
        <h2 className="font-heading text-h3 text-primary">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="absolute inset-0 flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-sm rounded-full transition-colors hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-sm rounded-full transition-colors hover:bg-background"
          >
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center font-body text-small text-primary/60 pb-sm"
          >
            {day}
          </div>
        ))}

        {daysInGrid.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selected ? isSameDay(selected, day) : false;
          const isDisabled =
            day < firstAvailableDate ||
            unavailableDateStrings.has(format(day, "yyyy-MM-dd"));
          const isSuggested = suggestionTimestamps.has(
            startOfDay(day).getTime()
          );
          const isPopupOpenForThisDay = popupDate
            ? isSameDay(popupDate, day)
            : false;

          return (
            <div
              key={i}
              className="flex items-center justify-center aspect-square"
            >
              {isSplitRequired && !isDisabled && isCurrentMonth ? (
                <PopoverPrimitive.Root
                  open={isPopupOpenForThisDay}
                  onOpenChange={(open) => handlePopoverOpenChange(open, day)}
                >
                  <PopoverPrimitive.Trigger asChild>
                    <button
                      type="button"
                      disabled={!isCurrentMonth}
                      className={cn(
                        "flex h-full w-full items-center justify-center rounded-medium font-body transition-colors",
                        isSelected && "ring-2 ring-accent ring-offset-1",
                        "hover:bg-subtleBackground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1",
                        !isSelected && isToday(day) && "font-bold text-accent"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  </PopoverPrimitive.Trigger>

                  <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content
                      sideOffset={5}
                      className="z-50 w-64 rounded-medium border border-border bg-card-background p-sm shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                      align="center"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="space-y-sm max-h-60 overflow-y-auto pr-sm bg-background p-sm rounded-medium">
                        <div className="flex justify-between items-center mb-xs">
                          <p className="font-body text-small font-semibold text-primary">
                            Assign to {format(day, "MMM d")}
                          </p>
                          <PopoverPrimitive.Close asChild>
                            <button
                              aria-label="Close"
                              className="p-1 rounded-full hover:bg-subtleBackground transition-colors"
                              onClick={() => setPopupDate?.(null)}
                            >
                              <X className="h-4 w-4 text-primary/60" />
                            </button>
                          </PopoverPrimitive.Close>
                        </div>
                        {unallocatedItems && unallocatedItems.length > 0 ? (
                          unallocatedItems.map((item: UniqueCartItem) => (
                            <div
                              key={item.uniqueId}
                              className="flex items-center justify-between p-xs bg-card-background rounded-small"
                            >
                              <div>
                                <p className="font-body text-small font-bold text-primary">
                                  {item.name}
                                </p>
                                <p className="font-body text-small text-primary/80">
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
                <button
                  type="button"
                  onClick={() => onSelect?.(day)}
                  disabled={isDisabled || !isCurrentMonth}
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-medium font-body transition-colors",
                    !isCurrentMonth && "text-transparent pointer-events-none",
                    isDisabled &&
                      "text-primary/40 cursor-not-allowed line-through",
                    !isDisabled &&
                      isSelected &&
                      "bg-accent text-white hover:bg-accent/90",
                    !isDisabled &&
                      !isSelected &&
                      isSuggested &&
                      "bg-success/20 text-success font-bold",
                    !isDisabled &&
                      !isSelected &&
                      !isSuggested &&
                      "hover:bg-subtleBackground",
                    !isDisabled &&
                      !isSelected &&
                      !isSuggested &&
                      isToday(day) &&
                      "font-bold text-accent"
                  )}
                >
                  {format(day, "d")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomDatePicker;
