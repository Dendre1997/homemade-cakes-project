"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  bakeryMonthGrid,
  formatBakeryDate,
  shiftBakeryMonth,
} from "@/lib/dates/bakeryCalendar";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type BakeryMonthGridProps = {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  renderDay: (dateKey: string) => React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  paddingCellClassName?: string;
  /** When false, only month navigation header is shown (e.g. desktop orders strip). */
  showGrid?: boolean;
};

export function BakeryMonthGrid({
  monthKey,
  onMonthChange,
  renderDay,
  footer,
  className,
  paddingCellClassName = "min-h-16",
  showGrid = true,
}: BakeryMonthGridProps) {
  const cells = bakeryMonthGrid(monthKey);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex items-center justify-center pb-4 pt-1">
        <h2 className="font-heading text-xl font-semibold text-primary">
          {formatBakeryDate(`${monthKey}-01`, {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div className="absolute inset-0 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onMonthChange(shiftBakeryMonth(monthKey, -1))}
            className="rounded-full p-2 text-primary transition-colors hover:bg-background/40"
            aria-label="Go to previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(shiftBakeryMonth(monthKey, 1))}
            className="rounded-full p-2 text-primary transition-colors hover:bg-background/40"
            aria-label="Go to next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showGrid ? (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-xs font-medium text-primary/60"
            >
              {day}
            </div>
          ))}

          {cells.map((dateKey, index) => {
            if (!dateKey) {
              return (
                <div key={`pad-${index}`} className={paddingCellClassName} />
              );
            }
            return <div key={dateKey}>{renderDay(dateKey)}</div>;
          })}
        </div>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
