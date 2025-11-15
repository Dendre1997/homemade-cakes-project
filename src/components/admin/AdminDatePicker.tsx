"use client";
import { useState, useEffect, useMemo } from "react";
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
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScheduleSettings } from "@/types";
import { TimeSlotManager } from "@/components/ui/TimeSlotManager";

type DateOverride = {
  date: Date;
  workMinutes?: number;
  isBlocked?: boolean;
  availableHours?: string[];
};

interface AdminDatePickerProps {
  settings: Partial<ScheduleSettings>;
  onSettingsChange: (newSettings: Partial<ScheduleSettings>) => void;
  minutesBookedPerDay: Record<string, number>;
}

export const AdminDatePicker = ({
  settings,
  onSettingsChange,
  minutesBookedPerDay = {},
}: AdminDatePickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentOverrideMinutes, setCurrentOverrideMinutes] = useState("");
  const [currentOverrideHours, setCurrentOverrideHours] = useState<string[]>(
    []
  );

  const {
    dateOverrides = [],
    defaultWorkMinutes = 240,
    defaultAvailableHours = [],
  } = settings;

  const minutesBookedMap = useMemo(
    () => new Map(Object.entries(minutesBookedPerDay)),
    [minutesBookedPerDay]
  );

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (day: Date) => {
    const override = dateOverrides.find((o) => isSameDay(o.date, day));
    setSelectedDate(day);
    setCurrentOverrideMinutes(override?.workMinutes?.toString() || "");
    setCurrentOverrideHours(
      override?.availableHours || settings.defaultAvailableHours || []
    );
    setIsModalOpen(true);
  };

  const handleSaveOverride = (action: "save" | "block" | "reset") => {
    if (!selectedDate) return;
    let newOverrides = [...dateOverrides];
    newOverrides = newOverrides.filter((o) => !isSameDay(o.date, selectedDate));

    if (action === "save") {
      const minutes = parseInt(currentOverrideMinutes, 10);
      const newOverride: DateOverride = { date: selectedDate };

      let hasCustomData = false;

      if (!isNaN(minutes)) {
        newOverride.workMinutes = minutes;
        hasCustomData = true;
      }

      if (
        JSON.stringify(currentOverrideHours) !==
        JSON.stringify(settings.defaultAvailableHours)
      ) {
        newOverride.availableHours = currentOverrideHours;
        hasCustomData = true;
      }

      if (hasCustomData) {
        newOverrides.push(newOverride);
      }
    } else if (action === "block") {
      newOverrides.push({ date: selectedDate, isBlocked: true });
    }

    onSettingsChange({ ...settings, dateOverrides: newOverrides });
    setIsModalOpen(false);
  };

  const daysInGrid = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  });
  const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
      <div className="w-full bg-card-background p-lg rounded-large shadow-md">
        {/* --- Navigation Header --- */}
        <div className="relative flex items-center justify-center pt-2 pb-4">
          <h2 className="font-heading text-h3 text-primary">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="absolute inset-0 flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-sm rounded-full transition-colors hover:bg-background"
              aria-label="Go to previous month"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-sm rounded-full transition-colors hover:bg-background"
              aria-label="Go to next month"
            >
              <ChevronRight className="h-5 w-5 text-primary" />
            </button>
          </div>
        </div>

        {/* --- Calendar Grid --- */}
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
            const override = dateOverrides.find((o) => isSameDay(o.date, day));

            return (
              <div
                key={i}
                className="flex items-center justify-center aspect-square"
              >
                <button
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={!isCurrentMonth}
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-medium font-body transition-all duration-200 ease-in-out",
                    !isCurrentMonth && "text-primary/40 opacity-50",

                    // --- Blocked State ---
                    override?.isBlocked &&
                      "bg-error text-white hover:bg-error/90",

                    // --- Available State ---
                    !override?.isBlocked && [
                      "hover:bg-subtleBackground",
                      override?.workMinutes &&
                        "bg-accent/20 text-accent font-bold",
                      override?.availableHours && "ring-1 ring-accent",
                      isToday(day) && !override && "font-bold text-accent",
                    ]
                  )}
                >
                  {format(day, "d")}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Dialog Content --- */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card-background p-lg rounded-large shadow-lg w-full max-w-sm z-50">
          <Dialog.Title className="font-heading text-h3 text-primary">
            Edit Date:{" "}
            {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
          </Dialog.Title>
          <div className="mt-md space-y-md">
            <div>
              <label
                htmlFor="custom-minutes"
                className="block font-body text-small text-primary/80 mb-sm"
              >
                Custom Work Minutes (Default: {defaultWorkMinutes})
              </label>
              <Input
                id="custom-minutes"
                type="number"
                value={currentOverrideMinutes}
                onChange={(e) => setCurrentOverrideMinutes(e.target.value)}
                placeholder={`e.g., 360 (for 6 hours)`}
              />
            </div>
            <div>
              <label className="block font-body text-small text-primary/80 mb-sm">
                Available Time Slots (Default: {defaultAvailableHours.length}{" "}
                slots)
              </label>
              <TimeSlotManager
                value={currentOverrideHours}
                onChange={setCurrentOverrideHours}
              />
            </div>
          </div>

          <div className="mt-lg space-y-sm border-t border-border pt-md">
            <Button
              onClick={() => handleSaveOverride("save")}
              className="w-full"
              variant="primary"
            >
              Save Changes
            </Button>
            <Button
              onClick={() => handleSaveOverride("block")}
              variant="danger"
              className="w-full"
            >
              Block this Date
            </Button>
            <Button
              onClick={() => handleSaveOverride("reset")}
              variant="text"
              className="w-full"
            >
              Reset to Default
            </Button>
          </div>
          <Dialog.Close asChild>
            <button className="absolute top-md right-md p-1 rounded-full transition-colors text-primary/60 hover:bg-subtleBackground">
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AdminDatePicker;
