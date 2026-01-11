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
  subDays,
  isBefore,
  isAfter,
  isWithinInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface CustomDateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onSelectRange: (start: Date | null, end: Date | null) => void;
  unavailableDates?: string[];
  className?: string; // Explicitly included in props
  showPresets?: boolean;
}

const CustomDateRangePicker = ({
  startDate,
  endDate,
  onSelectRange,
  unavailableDates = [],
  className,
  showPresets = true,
}: CustomDateRangePickerProps) => {
  // If no start date is selected, default to current month
  const [currentMonth, setCurrentMonth] = useState(
    startDate ? new Date(startDate) : new Date()
  );
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const unavailableDateStrings = useMemo(() => {
    return new Set(unavailableDates);
  }, [unavailableDates]);

  const firstDay = startOfMonth(currentMonth);
  const lastDay = endOfMonth(currentMonth);
  const startGrid = startOfWeek(firstDay, { weekStartsOn: 1 });
  const endGrid = endOfWeek(lastDay, { weekStartsOn: 1 });
  const daysInGrid = eachDayOfInterval({ start: startGrid, end: endGrid });
  const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (day: Date) => {
    if (!startDate && !endDate) {
      onSelectRange(day, null);
      return;
    }

    if (startDate && endDate) {
      onSelectRange(day, null);
      return;
    }

    // 3. If only Start selected
    if (startDate && !endDate) {
      if (isBefore(day, startDate)) {
        onSelectRange(day, null);
      } else {
        onSelectRange(startDate, day);
      }
    }
  };

  const handlePresetClick = (preset: "week" | "month" | "3months") => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (preset) {
      case "week":
        start = subDays(today, 7);
        break;
      case "month":
        start = startOfMonth(today);
        break;
      case "3months":
        start = subMonths(today, 3);
        break;
    }

    onSelectRange(start, end);
    setCurrentMonth(start); 
  };

  return (
    <div className={cn("flex flex-col lg:flex-row gap-2 bg-card-background p-4 rounded-large shadow-md", className)}>
       {/* Sidebar Presets */}
      {showPresets && (
        <div className="flex flex-col gap-2 min-w-[140px] border-b lg:border-b-0 lg:border-r border-border pb-2 lg:pb-0 lg:pr-2">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2 px-2">Presets</p>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-left px-2 font-normal"
            onClick={() => handlePresetClick("week")}
          >
            Last 7 Days
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-left px-2 font-normal"
            onClick={() => handlePresetClick("month")}
          >
            This Month
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-left px-2 font-normal"
            onClick={() => handlePresetClick("3months")}
          >
            Last 3 Months
          </Button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 w-full">
        <div className="relative flex items-center justify-center pt-2 pb-4">
          <h2 className="font-heading text-h3 text-primary">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="absolute inset-0 flex items-center justify-between">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-sm rounded-full transition-colors hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </button>
            <button
              type="button"
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
            const dateString = format(day, "yyyy-MM-dd");
            const isDisabled = unavailableDateStrings.has(dateString);

            // Selection States
            const isStart = startDate ? isSameDay(day, startDate) : false;
            const isEnd = endDate ? isSameDay(day, endDate) : false;
            
            let isInRange = false;
            if (startDate && endDate) {
              isInRange = isWithinInterval(day, { start: startDate, end: endDate });
            }

            // Hover States (Predictive Range)
            let isHoverRange = false;
            if (startDate && !endDate && hoveredDate) {
               if (isAfter(hoveredDate, startDate)) {
                  isHoverRange = isWithinInterval(day, { start: startDate, end: hoveredDate }) && !isSameDay(day, startDate);
               }
            }

            return (
              <div
                key={i}
                className="flex items-center justify-center aspect-square"
              >
                <button
                  type="button"
                  onClick={() => !isDisabled && handleDateClick(day)}
                  onMouseEnter={() => setHoveredDate(day)}
                  onMouseLeave={() => setHoveredDate(null)}
                  disabled={isDisabled || !isCurrentMonth}
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-medium font-body transition-colors",
                    !isCurrentMonth && "text-transparent pointer-events-none",
                    isDisabled && "text-primary/40 cursor-not-allowed line-through",
                    
                    // Selected Start/End
                    (isStart || isEnd) && !isDisabled && "bg-accent text-white font-bold shadow-sm",
                    
                    // In actual range (between start and end)
                    isInRange && !isStart && !isEnd && !isDisabled && "bg-accent/20 text-accent font-medium rounded-none",
                    
                    // First/Last in range specific rounding
                    isInRange && isStart && "rounded-r-none",
                    isInRange && isEnd && "rounded-l-none",
                    
                    // Hover Range (Preview)
                    isHoverRange && !isStart && !isDisabled && "bg-accent/10 dashed-border text-accent/80",

                    // Standard Hover
                    !isStart && !isEnd && !isInRange && !isHoverRange && !isDisabled && "hover:bg-subtleBackground",
                    
                    // Today marker (if not selected)
                    !isStart && !isEnd && !isInRange && isToday(day) && "font-bold text-accent"
                  )}
                >
                  {format(day, "d")}
                </button>
              </div>
            );
          })}
        </div>
         {/* Footer / Helper Text */}
        <div className="mt-md text-center">
           <p className="text-small text-primary/60">
              {startDate && !endDate ? "Select End Date" : ""}
              {!startDate && "Select Start Date"}
              {startDate && endDate && `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`}
           </p>
        </div>
      </div>
    </div>
  );
};

export default CustomDateRangePicker;
