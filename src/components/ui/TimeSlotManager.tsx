"use client";

import { useState } from "react";
import { PlusCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./Select";

const formatTime = (hour: string, minute: string, period: string) => {
  return `${hour}:${minute} ${period}`;
};

const get12Hour = (hour24: number) => {
  return (hour24 % 12 || 12).toString();
};

// Helper function to get AM/PM
const getPeriod = (hour24: number) => {
  return hour24 >= 12 ? "PM" : "AM";
};

// Helper to generate options
const generateHourOptions = () => {
  const hours = [];
  for (let i = 1; i <= 12; i++) {
    hours.push(i.toString());
  }
  return hours;
};

const generateMinuteOptions = () => {
  return ['00', '30'];
};

const PRESETS = [
  '7:00 AM - 7:30 AM',
  '7:30 AM - 8:00 AM',
  '8:00 AM - 8:30 AM',
  '8:30 AM - 9:00 AM',
  '6:00 PM - 6:30 PM',
  '6:30 PM - 7:00 PM',
  '7:00 PM - 7:30 PM',
  '7:30 PM - 8:00 PM',
];

interface TimeSlotManagerProps {
  value: string[];
  onChange: (newSlots: string[]) => void;
  /** Glass styling for schedule day editor / booking rules */
  variant?: "default" | "schedule";
  /** Taller controls for the production order time dialog. */
  comfortable?: boolean;
}

export const TimeSlotManager = ({
  value,
  onChange,
  variant = "default",
  comfortable = false,
}: TimeSlotManagerProps) => {
  const isSchedule = variant === "schedule";
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");

  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("AM");

  const [validationError, setValidationError] = useState('');

  const handleAddSlot = () => {
    const toMinutes = (hour: string, minute: string, period: string) => {
      let h = parseInt(hour);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + parseInt(minute);
    };
    const startTotal = toMinutes(startHour, startMinute, startPeriod);
    const endTotal = toMinutes(endHour, endMinute, endPeriod);
    if (endTotal <= startTotal) {
      setValidationError('End time must be after start time');
      return;
    }
    setValidationError('');

    const newSlot = `${formatTime(startHour, startMinute, startPeriod)} - ${formatTime(endHour, endMinute, endPeriod)}`;

    if (!value.includes(newSlot)) {
      onChange([...value, newSlot]); 
    }

    // After slot is added, advance by 30 minutes from end time
    const nextStartTotal = endTotal;
    const nextEndTotal = endTotal + 30;

    const toTimeComponents = (totalMinutes: number) => {
      const h24 = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return {
        hour: get12Hour(h24),
        minute: m.toString().padStart(2, '0'),
        period: getPeriod(h24)
      };
    };

    const nextStart = toTimeComponents(nextStartTotal);
    const nextEnd = toTimeComponents(nextEndTotal);
    setStartHour(nextStart.hour);
    setStartMinute(nextStart.minute);
    setStartPeriod(nextStart.period);
    setEndHour(nextEnd.hour);
    setEndMinute(nextEnd.minute);
    setEndPeriod(nextEnd.period);
  };

  const handleRemoveSlot = (slotToRemove: string) => {
    onChange(value.filter((slot) => slot !== slotToRemove));
  };

  const parseTime = (slot: string) => {
    const match = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  const sortedSlots = [...value].sort((a, b) => parseTime(a) - parseTime(b));

  return (
    <div
      className={cn(
        isSchedule ? "space-y-3" : "mt-md space-y-sm",
        isSchedule ? "max-h-56 overflow-y-auto pr-1" : "max-h-80 overflow-y-auto pr-sm custom-scrollbar",
        comfortable && "overscroll-contain"
      )}
    >
      {/* Quick Add Presets */}
      <div>
        <p className="font-body text-small text-primary/70 mb-2">Quick Add:</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(preset => {
            const alreadyAdded = value.includes(preset);
            return (
              <button
                key={preset}
                type="button"
                disabled={alreadyAdded}
                onClick={() => {
                  if (!alreadyAdded) onChange([...value, preset]);
                }}
                className={cn(
                  comfortable
                    ? "min-h-11 rounded-xl border px-3 text-xs transition-colors sm:min-h-10"
                    : "rounded-full border px-2 py-1 text-xs transition-all",
                  alreadyAdded
                    ? "border-accent/30 bg-accent/10 text-accent/50 cursor-not-allowed"
                    : "border-border hover:border-accent hover:bg-accent/5 text-primary"
                )}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Picker Controls */}
      <div
        className={cn(
          "flex flex-col gap-sm rounded-medium p-md",
          isSchedule
            ? "border border-primary/10 bg-background/40"
            : "bg-subtleBackground shadow-inset"
        )}
      >
        <h3 className="font-body text-normal font-semibold text-primary">
          Select time range
        </h3>

        {/* Start Time Picker */}
        <div className="flex items-center gap-2">
          
          <Select value={startHour} onValueChange={setStartHour}>
            <SelectTrigger className={comfortable ? "h-11 min-w-0 flex-grow rounded-xl sm:h-10" : "flex-grow"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateHourOptions().map((h) => (
                <SelectItem key={`sh-${h}`} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-primary">:</span>
          <Select value={startMinute} onValueChange={setStartMinute}>
            <SelectTrigger className={comfortable ? "h-11 min-w-0 flex-grow rounded-xl sm:h-10" : "flex-grow"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateMinuteOptions().map((m) => (
                <SelectItem key={`sm-${m}`} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className={cn("flex flex-shrink-0 overflow-hidden rounded-medium border border-border", comfortable && "rounded-xl")}>
            <button
              type="button"
              className={cn(
                "px-sm py-xs font-body text-small",
                comfortable && "min-h-11 px-3 sm:min-h-10",
                startPeriod === "AM"
                  ? "bg-accent text-white"
                  : "bg-input-background text-primary/70 hover:bg-subtleBackground"
              )}
              onClick={() => setStartPeriod("AM")}
            >
              AM
            </button>
            <button
              type="button"
              className={cn(
                "px-sm py-xs font-body text-small",
                comfortable && "min-h-11 px-3 sm:min-h-10",
                startPeriod === "PM"
                  ? "bg-accent text-white"
                  : "bg-input-background text-primary/70 hover:bg-subtleBackground"
              )}
              onClick={() => setStartPeriod("PM")}
            >
              PM
            </button>
          </div>
        </div>

        {/* End Time Picker */}
        <div className="flex items-center gap-2">
          <Select value={endHour} onValueChange={setEndHour}>
            <SelectTrigger className={comfortable ? "h-11 min-w-0 flex-grow rounded-xl sm:h-10" : "flex-grow"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateHourOptions().map((h) => (
                <SelectItem key={`eh-${h}`} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-primary">:</span>
          <Select value={endMinute} onValueChange={setEndMinute}>
            <SelectTrigger className={comfortable ? "h-11 min-w-0 flex-grow rounded-xl sm:h-10" : "flex-grow"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateMinuteOptions().map((m) => (
                <SelectItem key={`em-${m}`} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className={cn("flex flex-shrink-0 overflow-hidden rounded-medium border border-border", comfortable && "rounded-xl")}>
            <button
              type="button"
              className={cn(
                "px-sm py-xs font-body text-small",
                comfortable && "min-h-11 px-3 sm:min-h-10",
                endPeriod === "AM"
                  ? "bg-accent text-white"
                  : "bg-input-background text-primary/70 hover:bg-subtleBackground"
              )}
              onClick={() => setEndPeriod("AM")}
            >
              AM
            </button>
            <button
              type="button"
              className={cn(
                "px-sm py-xs font-body text-small",
                comfortable && "min-h-11 px-3 sm:min-h-10",
                endPeriod === "PM"
                  ? "bg-accent text-white"
                  : "bg-input-background text-primary/70 hover:bg-subtleBackground"
              )}
              onClick={() => setEndPeriod("PM")}
            >
              PM
            </button>
          </div>
        </div>

        <Button
          onClick={handleAddSlot}
          variant="primary"
          className={cn("mt-sm w-full", comfortable && "h-11 rounded-xl sm:h-10")}
        >
          <PlusCircle className={cn("mr-2 h-4 w-4", comfortable && "shrink-0")} /> Add Time Slot
        </Button>
        {validationError && (
          <p className="text-xs text-red-500 mt-1">{validationError}</p>
        )}
      </div>

      <div className="mt-md space-y-sm">
        {sortedSlots.length === 0 ? (
          <p className="font-body text-primary/70 text-small text-center py-md">
            No time slots added yet.
          </p>
        ) : (
          sortedSlots.map((slot, index) => (
            <div
              key={`${slot}-${index}`}
              className={cn(
                "flex items-center gap-sm rounded-medium pl-md pr-sm py-xs",
                "font-body text-small font-semibold",
                "bg-accent/10 text-accent"
              )}
            >
              <span className="flex-grow">{slot}</span>
              <button
                type="button"
                onClick={() => handleRemoveSlot(slot)}
                className={cn(
                  "text-accent/80 transition-colors hover:text-accent",
                  isSchedule
                    ? "p-xs"
                    : comfortable
                      ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
                      : "p-xs"
                )}
                aria-label={`Remove ${slot}`}
              >
                <X className={cn("h-4 w-4", comfortable && "shrink-0")} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
