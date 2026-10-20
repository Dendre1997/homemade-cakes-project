"use client";

import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { label: "Sun", short: "S", value: 0, weekend: true },
  { label: "Mon", short: "M", value: 1, weekend: false },
  { label: "Tue", short: "T", value: 2, weekend: false },
  { label: "Wed", short: "W", value: 3, weekend: false },
  { label: "Thu", short: "T", value: 4, weekend: false },
  { label: "Fri", short: "F", value: 5, weekend: false },
  { label: "Sat", short: "S", value: 6, weekend: true },
] as const;

type ScheduleWeekdayStripProps = {
  weekdayHours: Record<number, string[]> | undefined;
  onSelectDay: (day: number) => void;
};

export function ScheduleWeekdayStrip({
  weekdayHours,
  onSelectDay,
}: ScheduleWeekdayStripProps) {
  const customCount = WEEKDAYS.filter(
    (day) => (weekdayHours?.[day.value]?.length ?? 0) > 0
  ).length;

  return (
    <div className="rounded-2xl border border-primary/15 bg-background/20 p-4 shadow-sm backdrop-blur-xl backdrop-saturate-150 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-primary">
            Weekday pickup slots
          </h2>
          <p className="mt-1 text-sm text-primary/70">
            Override default slots for specific weekdays. Tap a day to edit.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-primary/15 bg-background/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary/70">
          {customCount}/7 custom
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((day) => {
          const slots = weekdayHours?.[day.value];
          const count = slots?.length ?? 0;
          const hasCustom = count > 0;

          return (
            <button
              key={day.value}
              type="button"
              onClick={() => onSelectDay(day.value)}
              className={cn(
                "group flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                day.weekend && !hasCustom && "bg-background/15",
                hasCustom
                  ? "border-accent/50 bg-accent/10 shadow-sm hover:bg-accent/15"
                  : "border-primary/10 bg-background/30 hover:border-primary/20 hover:bg-background/45"
              )}
              aria-label={`${day.label}, ${hasCustom ? `${count} custom slots` : "using default slots"}`}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:hidden",
                  hasCustom
                    ? "bg-accent text-white"
                    : "bg-primary/10 text-primary/80 group-hover:bg-primary/15"
                )}
              >
                {day.short}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:block",
                  hasCustom ? "text-accent" : "text-primary"
                )}
              >
                {day.label}
              </span>
              <span
                className={cn(
                  "max-w-full truncate rounded-md px-1.5 py-0.5 text-[9px] font-medium leading-tight sm:text-[10px]",
                  hasCustom
                    ? "bg-accent/15 text-accent"
                    : "text-primary/45"
                )}
              >
                {hasCustom ? `${count} slot${count > 1 ? "s" : ""}` : "Default"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { WEEKDAYS as SCHEDULE_WEEKDAYS };
