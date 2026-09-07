"use client";

import {
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  TriangleAlert,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ManageCalendarToolResult } from "@/lib/ai/uiMessage";
import type { ScheduleCalendarAction } from "@/lib/db/schedule-helpers";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface CalendarCardProps {
  result: ManageCalendarToolResult;
  className?: string;
}

function formatDateKey(dateKey: string): string {
  return format(parseISO(`${dateKey}T12:00:00.000Z`), "MMM d, yyyy");
}

function actionLabel(action: ScheduleCalendarAction): string {
  switch (action) {
    case "block":
      return "Blocked";
    case "unblock":
      return "Unblocked";
    case "update_capacity":
      return "Capacity updated";
    case "update_slots":
      return "Time slots updated";
    default:
      return "Updated";
  }
}

function actionTitle(result: Extract<ManageCalendarToolResult, { success: true }>) {
  const count = result.modifiedDates.length;
  const dateWord = `${count} date${count === 1 ? "" : "s"}`;

  switch (result.action) {
    case "block":
      return `Successfully blocked ${dateWord}`;
    case "unblock":
      return `Successfully unblocked ${dateWord}`;
    case "update_capacity":
      return `Updated capacity for ${dateWord}`;
    case "update_slots":
      return `Updated time slots for ${dateWord}`;
  }
}

export function CalendarCard({ result, className }: CalendarCardProps) {
  if (!result.success) {
    return (
      <div
        className={cn(
          "rounded-large border border-error/40 bg-error/10 px-md py-sm font-body text-small text-error",
          className
        )}
      >
        <p className="inline-flex items-center gap-sm">
          <TriangleAlert className="h-4 w-4" />
          Schedule update failed
        </p>
        <p className="mt-xs text-error/80">{result.message}</p>
      </div>
    );
  }

  const sortedDates = [...result.modifiedDates].sort();
  const isBlock = result.action === "block";
  const isDestructive = isBlock;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-large border border-border bg-card-background shadow-sm",
        className
      )}
    >
      <div className="border-b border-border bg-subtleBackground px-md py-sm">
        <p className="inline-flex items-center gap-sm font-heading text-h5 text-primary">
          {isBlock ? (
            <CalendarOff className="h-4 w-4 text-error" />
          ) : result.action === "update_capacity" ||
            result.action === "update_slots" ? (
            <CalendarClock className="h-4 w-4 text-accent" />
          ) : (
            <CalendarCheck className="h-4 w-4 text-accent" />
          )}
          {actionTitle(result)}
        </p>
      </div>

      <div className="space-y-md p-md">
        <Badge variant={isDestructive ? "destructive" : "secondary"}>
          {actionLabel(result.action)}
        </Badge>

        <ul className="space-y-xs rounded-medium border border-border bg-background px-sm py-sm">
          {sortedDates.map((dateKey) => (
            <li key={dateKey} className="font-mono text-small text-primary">
              {formatDateKey(dateKey)}
              <span className="ml-sm font-body text-primary/50">{dateKey}</span>
            </li>
          ))}
        </ul>

        {result.action === "update_capacity" &&
          result.workMinutes !== undefined && (
            <div>
              <p className="font-body text-small font-semibold text-primary/70">
                Work minutes
              </p>
              <p className="mt-xs font-body text-small text-primary">
                {result.workMinutes === null
                  ? "Reset to default"
                  : `${result.workMinutes} minutes`}
              </p>
            </div>
          )}

        {result.action === "update_slots" &&
          result.availableHours !== undefined && (
            <div>
              <p className="font-body text-small font-semibold text-primary/70">
                Time slots
              </p>
              {result.availableHours === null ? (
                <p className="mt-xs font-body text-small text-primary">
                  Reset to default
                </p>
              ) : (
                <ul className="mt-xs space-y-xs rounded-medium border border-border bg-background px-sm py-sm">
                  {result.availableHours.map((slot) => (
                    <li key={slot} className="font-body text-small text-primary">
                      {slot}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        {result.reason && (
          <div>
            <p className="font-body text-small font-semibold text-primary/70">
              Reason
            </p>
            <p className="mt-xs font-body text-small text-primary">
              {result.reason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarCard;
