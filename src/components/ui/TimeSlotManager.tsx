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
  const minutes = [];
  for (let i = 0; i < 60; i += 10) {
    minutes.push(i.toString().padStart(2, "0"));
  }
  return minutes;
};

interface TimeSlotManagerProps {
  value: string[];
  onChange: (newSlots: string[]) => void;
}

export const TimeSlotManager = ({ value, onChange }: TimeSlotManagerProps) => {
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");

  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("AM");

  const handleAddSlot = () => {
    const newSlot = `${formatTime(startHour, startMinute, startPeriod)} - ${formatTime(endHour, endMinute, endPeriod)}`;

    if (!value.includes(newSlot)) {
      onChange([...value, newSlot]); 
    }

    let currentEndHour24 = parseInt(endHour, 10);
    if (endPeriod === "PM" && currentEndHour24 !== 12) {
      currentEndHour24 += 12;
    }
    if (endPeriod === "AM" && currentEndHour24 === 12) {
      currentEndHour24 = 0;
    }

    const nextHour24 = (currentEndHour24 + 1) % 24; 
    setStartHour(get12Hour(currentEndHour24));
    setStartMinute(endMinute);
    setStartPeriod(getPeriod(currentEndHour24));

    setEndHour(get12Hour(nextHour24));
    setEndMinute(endMinute);
    setEndPeriod(getPeriod(nextHour24));
  };

  const handleRemoveSlot = (slotToRemove: string) => {
    onChange(value.filter((slot) => slot !== slotToRemove));
  };

  return (
    <div
      className={cn(
        "mt-md space-y-sm",
        "max-h-80 overflow-y-auto",
        "pr-sm custom-scrollbar" 
      )}
    >
      {/* Time Picker Controls */}
      <div className="flex flex-col gap-sm p-md rounded-medium bg-subtleBackground shadow-inset">
        <h3 className="font-body text-normal font-semibold text-primary">
          Select Time Range
        </h3>

        {/* Start Time Picker */}
        <div className="flex items-center gap-2">
          
          <Select value={startHour} onValueChange={setStartHour}>
            <SelectTrigger className="flex-grow">
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
            <SelectTrigger className="flex-grow">
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
          <div className="flex-shrink-0 flex rounded-medium border border-border overflow-hidden">
            <button
              type="button"
              className={cn(
                "px-sm py-xs text-small font-body",
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
                "px-sm py-xs text-small font-body",
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
            <SelectTrigger className="flex-grow">
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
            <SelectTrigger className="flex-grow">
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
          <div className="flex-shrink-0 flex rounded-medium border border-border overflow-hidden">
            <button
              type="button"
              className={cn(
                "px-sm py-xs text-small font-body",
                endPeriod === "AM"
                  ? "bg-accent text-white"
                  : "bg-input-background text-primary/70 hover:bg-subtleBackground"
              )}
              onClick={() => setEndPeriod("AM")}
            >
              AM
            </button>{" "}
            <button
              type="button"
              className={cn(
                "px-sm py-xs text-small font-body",
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
          className="mt-sm w-full"
        >
          <PlusCircle className="h-4 w-4 mr-2" /> Add Time Slot
        </Button>
      </div>

      <div className="mt-md space-y-sm">
        {value.length === 0 ? (
          <p className="font-body text-primary/70 text-small text-center py-md">
            No time slots added yet.
          </p>
        ) : (
          value.map((slot, index) => (
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
                className="p-xs text-accent/80 hover:text-accent transition-colors"
                aria-label={`Remove ${slot}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
