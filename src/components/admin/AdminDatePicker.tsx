"use client";

import { useMemo, useState } from "react";
import { ScheduleSettings } from "@/types";
import { addDaysToKey, toDateKey } from "@/lib/db/capacity";
import {
  bakeryMonthKeyFromDateKey,
  dateKeyToStoredDate,
  formatBakeryDate,
} from "@/lib/dates/bakeryCalendar";
import { cn } from "@/lib/utils";
import { BakeryMonthGrid } from "@/components/admin/calendar/BakeryMonthGrid";
import {
  ScheduleDayEditor,
  type DayEditorOriginRect,
} from "@/components/admin/schedule/ScheduleDayEditor";

type DateOverride = {
  date: Date | string;
  workMinutes?: number;
  isBlocked?: boolean;
  availableHours?: string[];
};

export type ScheduleAvailability = {
  availableMinutesPerDay: Record<string, number>;
  defaultWorkMinutes: number;
  leadTimeDays: number;
};

interface AdminDatePickerProps {
  settings: Partial<ScheduleSettings>;
  onSettingsChange: (newSettings: Partial<ScheduleSettings>) => void;
  availability: ScheduleAvailability;
  todayKey: string;
  onBlockToggle: (
    dateKey: string,
    action: "block" | "unblock"
  ) => Promise<boolean>;
  blockingDateKey: string | null;
  onDayEditorOpenChange?: (open: boolean) => void;
}

function dayNumber(dateKey: string): string {
  return dateKey.slice(8, 10).replace(/^0/, "");
}

export const AdminDatePicker = ({
  settings,
  onSettingsChange,
  availability,
  todayKey,
  onBlockToggle,
  blockingDateKey,
  onDayEditorOpenChange,
}: AdminDatePickerProps) => {
  const [monthKey, setMonthKey] = useState(() =>
    bakeryMonthKeyFromDateKey(todayKey)
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [editorSeed, setEditorSeed] = useState(0);
  const [editorOrigin, setEditorOrigin] = useState<DayEditorOriginRect | null>(
    null
  );

  const dateOverrides = (settings.dateOverrides ?? []) as DateOverride[];
  const defaultWorkMinutes =
    settings.defaultWorkMinutes ?? availability.defaultWorkMinutes ?? 240;
  const defaultAvailableHours = settings.defaultAvailableHours ?? [];
  const leadTimeDays = settings.leadTimeDays ?? availability.leadTimeDays ?? 3;

  const overrideByKey = useMemo(() => {
    const map = new Map<string, DateOverride>();
    for (const override of dateOverrides) {
      const key = toDateKey(override.date);
      if (key) map.set(key, override);
    }
    return map;
  }, [dateOverrides]);

  const describeDay = (dateKey: string) => {
    const override = overrideByKey.get(dateKey);
    const isBlocked = override?.isBlocked === true;
    const workMinutes = override?.workMinutes ?? defaultWorkMinutes;
    const available = availability.availableMinutesPerDay[dateKey];
    const hasAvailability = typeof available === "number" && !isBlocked;
    const booked = hasAvailability
      ? Math.max(0, workMinutes - available)
      : null;
    const utilization =
      hasAvailability && workMinutes > 0 && booked !== null
        ? Math.min(100, Math.round((booked / workMinutes) * 100))
        : 0;
    const isWithinLeadTime =
      !isBlocked && dateKey < addDaysToKey(todayKey, leadTimeDays);
    return {
      override,
      isBlocked,
      workMinutes,
      available: hasAvailability ? available : null,
      booked,
      utilization,
      isWithinLeadTime,
    };
  };

  const setEditorOpen = (open: boolean) => {
    setIsEditorOpen(open);
    onDayEditorOpenChange?.(open);
  };

  const openDay = (
    dateKey: string,
    anchor: HTMLButtonElement | null
  ) => {
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      setEditorOrigin({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setEditorOrigin(null);
    }
    setSelectedDateKey(dateKey);
    setEditorSeed((seed) => seed + 1);
    setEditorOpen(true);
  };

  const applyDayOverride = (
    action: "apply" | "reset",
    payload?: { workMinutes: string; availableHours: string[] }
  ) => {
    if (!selectedDateKey) return;
    let newOverrides = dateOverrides.filter(
      (override) => toDateKey(override.date) !== selectedDateKey
    );

    if (action === "apply" && payload) {
      const minutes = parseInt(payload.workMinutes, 10);
      const next: DateOverride = { date: dateKeyToStoredDate(selectedDateKey) };
      let hasCustomData = false;

      if (!isNaN(minutes) && payload.workMinutes.trim() !== "") {
        next.workMinutes = minutes;
        hasCustomData = true;
      }

      if (
        JSON.stringify(payload.availableHours) !==
        JSON.stringify(settings.defaultAvailableHours)
      ) {
        next.availableHours = payload.availableHours;
        hasCustomData = true;
      }

      const existing = overrideByKey.get(selectedDateKey);
      if (existing?.isBlocked) {
        next.isBlocked = true;
        hasCustomData = true;
      }

      if (hasCustomData) newOverrides.push(next);
    }

    onSettingsChange({
      ...settings,
      dateOverrides: newOverrides.map((override) => ({
        ...override,
        date:
          override.date instanceof Date
            ? override.date
            : new Date(override.date),
      })),
    });
    setEditorSeed((seed) => seed + 1);
  };

  const selected = selectedDateKey ? describeDay(selectedDateKey) : null;
  const selectedOverride = selectedDateKey
    ? overrideByKey.get(selectedDateKey)
    : undefined;
  const selectedLabel = selectedDateKey
    ? formatBakeryDate(selectedDateKey, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const initialWorkMinutes =
    selectedOverride?.workMinutes?.toString() ?? "";
  const initialAvailableHours =
    selectedOverride?.availableHours ?? defaultAvailableHours;

  return (
    <>
      <BakeryMonthGrid
        monthKey={monthKey}
        onMonthChange={setMonthKey}
        footer={
          <p className="text-center text-xs text-primary/60">
            Numbers are booked · available minutes. Times use America/Edmonton.
          </p>
        }
        renderDay={(dateKey) => {
          const day = describeDay(dateKey);
          const isToday = dateKey === todayKey;

          return (
            <button
              type="button"
              onClick={(event) => openDay(dateKey, event.currentTarget)}
              className={cn(
                "flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-primary transition-colors",
                day.isBlocked
                  ? "bg-error text-white hover:bg-error/90"
                  : "hover:bg-background/50",
                !day.isBlocked &&
                  day.override?.workMinutes &&
                  "bg-accent/15 font-semibold",
                !day.isBlocked &&
                  day.override?.availableHours &&
                  "ring-1 ring-accent",
                isToday && !day.isBlocked && "ring-2 ring-primary/40"
              )}
              aria-label={
                day.isBlocked
                  ? `${dateKey} blocked`
                  : `${dateKey}, ${day.booked ?? "unknown"} booked, ${day.available ?? "unknown"} available`
              }
            >
              <span className="text-xs font-semibold leading-none">
                {dayNumber(dateKey)}
              </span>
              {day.isBlocked ? (
                <span className="text-[9px] font-bold uppercase leading-none">
                  Blocked
                </span>
              ) : (
                <>
                  <span className="h-1 w-full max-w-9 overflow-hidden rounded-full bg-primary/10">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${day.utilization}%` }}
                    />
                  </span>
                  <span className="text-[9px] tabular-nums leading-none text-primary/70">
                    {day.booked === null || day.available === null
                      ? "— · —"
                      : `${day.booked} · ${day.available}`}
                  </span>
                </>
              )}
            </button>
          );
        }}
      />

      <ScheduleDayEditor
        key={`${selectedDateKey ?? "none"}-${editorSeed}`}
        open={isEditorOpen}
        onOpenChange={setEditorOpen}
        dateKey={selectedDateKey}
        dateLabel={selectedLabel}
        overview={
          selected
            ? {
                isBlocked: selected.isBlocked,
                isWithinLeadTime: selected.isWithinLeadTime,
                booked: selected.booked,
                available: selected.available,
                utilization: selected.utilization,
              }
            : null
        }
        defaultWorkMinutes={defaultWorkMinutes}
        defaultSlotCount={defaultAvailableHours.length}
        initialWorkMinutes={initialWorkMinutes}
        initialAvailableHours={initialAvailableHours}
        defaultAvailableHours={defaultAvailableHours}
        onApply={(payload) => applyDayOverride("apply", payload)}
        onResetToDefault={() => applyDayOverride("reset")}
        onBlockToggle={onBlockToggle}
        blockingDateKey={blockingDateKey}
        originRect={editorOrigin}
      />
    </>
  );
};

export default AdminDatePicker;
