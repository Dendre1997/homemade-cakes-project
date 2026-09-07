"use client";

import { CalendarClock, CalendarOff, CalendarPlus, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type CalendarApprovalAction =
  | "block"
  | "unblock"
  | "update_capacity"
  | "update_slots";

interface CalendarApprovalCardProps {
  action: CalendarApprovalAction;
  dates: string[];
  reason: string;
  workMinutes?: number | null;
  availableHours?: string[] | null;
  onApprove: () => void;
  onDeny: () => void;
  isResponding?: boolean;
  className?: string;
}

function formatDateKey(dateKey: string): string {
  return format(parseISO(`${dateKey}T12:00:00.000Z`), "MMM d, yyyy");
}

function actionHeading(action: CalendarApprovalAction): string {
  switch (action) {
    case "block":
      return "Block calendar dates?";
    case "unblock":
      return "Unblock calendar dates?";
    case "update_capacity":
      return "Update daily capacity?";
    case "update_slots":
      return "Update pickup time slots?";
  }
}

function actionBadge(action: CalendarApprovalAction): string {
  switch (action) {
    case "block":
      return "Block";
    case "unblock":
      return "Unblock";
    case "update_capacity":
      return "Capacity";
    case "update_slots":
      return "Time slots";
  }
}

export function CalendarApprovalCard({
  action,
  dates,
  reason,
  workMinutes,
  availableHours,
  onApprove,
  onDeny,
  isResponding = false,
  className,
}: CalendarApprovalCardProps) {
  const isBlock = action === "block";
  const sortedDates = [...dates].sort();

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
          ) : action === "update_capacity" || action === "update_slots" ? (
            <CalendarClock className="h-4 w-4 text-accent" />
          ) : (
            <CalendarPlus className="h-4 w-4 text-accent" />
          )}
          {actionHeading(action)}
        </p>
        <p className="mt-xs font-body text-small text-primary/60">
          Review and approve before the schedule is changed.
        </p>
      </div>

      <div className="space-y-md p-md">
        <div className="flex flex-wrap items-center gap-sm">
          <Badge variant={isBlock ? "destructive" : "secondary"}>
            {actionBadge(action)}
          </Badge>
          <span className="font-body text-small text-primary/70">
            {sortedDates.length} date{sortedDates.length === 1 ? "" : "s"}
          </span>
        </div>

        <ul className="space-y-xs rounded-medium border border-border bg-background px-sm py-sm">
          {sortedDates.map((dateKey) => (
            <li key={dateKey} className="font-mono text-small text-primary">
              {formatDateKey(dateKey)}
              <span className="ml-sm font-body text-primary/50">{dateKey}</span>
            </li>
          ))}
        </ul>

        {action === "update_capacity" && workMinutes !== undefined && (
          <div>
            <p className="font-body text-small font-semibold text-primary/70">
              Work minutes
            </p>
            <p className="mt-xs font-body text-small text-primary">
              {workMinutes === null
                ? "Reset to default"
                : `${workMinutes} minutes`}
            </p>
          </div>
        )}

        {action === "update_slots" && availableHours !== undefined && (
          <div>
            <p className="font-body text-small font-semibold text-primary/70">
              Time slots
            </p>
            {availableHours === null ? (
              <p className="mt-xs font-body text-small text-primary">
                Reset to default
              </p>
            ) : (
              <ul className="mt-xs space-y-xs rounded-medium border border-border bg-background px-sm py-sm">
                {availableHours.map((slot) => (
                  <li key={slot} className="font-body text-small text-primary">
                    {slot}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <p className="font-body text-small font-semibold text-primary/70">
            Reason
          </p>
          <p className="mt-xs font-body text-small text-primary">{reason}</p>
        </div>

        <div className="flex gap-sm border-t border-border pt-md">
          <Button
            type="button"
            variant="danger"
            className="flex-1"
            disabled={isResponding}
            onClick={onDeny}
          >
            Deny
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={isResponding}
            onClick={onApprove}
          >
            {isResponding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Approve"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CalendarApprovalCard;
