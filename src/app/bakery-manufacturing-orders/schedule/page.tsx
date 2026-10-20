"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FloatingActionBar } from "@/components/admin/FloatingActionBar";
import { ScheduleSettings } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import AdminDatePicker, {
  type ScheduleAvailability,
} from "@/components/admin/AdminDatePicker";
import LoadingSpinner from "@/components/ui/Spinner";
import { TimeSlotManager } from "@/components/ui/TimeSlotManager";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import {
  ScheduleWeekdayStrip,
  SCHEDULE_WEEKDAYS,
} from "@/components/admin/schedule/ScheduleWeekdayStrip";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { getBakeryToday, toDateKey } from "@/lib/db/capacity";
import { dateKeyToStoredDate } from "@/lib/dates/bakeryCalendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";

const EMPTY_AVAILABILITY: ScheduleAvailability = {
  availableMinutesPerDay: {},
  defaultWorkMinutes: 240,
  leadTimeDays: 3,
};

const WEEKDAYS = SCHEDULE_WEEKDAYS;

function parseAvailability(payload: unknown): ScheduleAvailability {
  if (!payload || typeof payload !== "object") return EMPTY_AVAILABILITY;
  const data = payload as {
    availableMinutesPerDay?: Record<string, number>;
    defaultWorkMinutes?: number;
    leadTimeDays?: number;
  };
  return {
    availableMinutesPerDay: data.availableMinutesPerDay ?? {},
    defaultWorkMinutes: data.defaultWorkMinutes ?? 240,
    leadTimeDays: data.leadTimeDays ?? 3,
  };
}

function withBlockChange(
  settings: Partial<ScheduleSettings>,
  dateKey: string,
  action: "block" | "unblock"
): Partial<ScheduleSettings> {
  const overrides = [...(settings.dateOverrides ?? [])];
  if (action === "unblock") {
    return {
      ...settings,
      dateOverrides: overrides.filter(
        (entry) => toDateKey(entry.date) !== dateKey
      ),
    };
  }

  const index = overrides.findIndex(
    (entry) => toDateKey(entry.date) === dateKey
  );
  if (index >= 0) {
    overrides[index] = {
      ...overrides[index],
      date: dateKeyToStoredDate(dateKey),
      isBlocked: true,
    };
  } else {
    overrides.push({
      date: dateKeyToStoredDate(dateKey),
      isBlocked: true,
      availableHours: [],
    });
  }
  return { ...settings, dateOverrides: overrides };
}

const SchedulePage = () => {
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();
  const [settings, setSettings] = useState<Partial<ScheduleSettings>>({
    leadTimeDays: 3,
    defaultWorkMinutes: 240,
    dateOverrides: [],
  });
  const [availability, setAvailability] =
    useState<ScheduleAvailability>(EMPTY_AVAILABILITY);
  const [todayKey, setTodayKey] = useState(getBakeryToday);
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [isWeekdayModalOpen, setIsWeekdayModalOpen] = useState(false);
  const [draftWeekdaySlots, setDraftWeekdaySlots] = useState<string[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [blockingDateKey, setBlockingDateKey] = useState<string | null>(null);
  const [isDayEditorOpen, setIsDayEditorOpen] = useState(false);
  const savedSettingsRef = useRef<Partial<ScheduleSettings> | null>(null);

  const serializeSettings = (value: Partial<ScheduleSettings>) =>
    JSON.stringify(value);

  const isDirty = useMemo(() => {
    if (!savedSettingsRef.current) return false;
    return (
      serializeSettings(settings) !== serializeSettings(savedSettingsRef.current)
    );
  }, [settings]);

  const refreshAvailability = useCallback(async () => {
    const bookedMinutesRes = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemsInCart: [] }),
    });
    if (!bookedMinutesRes.ok) {
      throw new Error("Failed to fetch schedule availability");
    }
    setAvailability(parseAvailability(await bookedMinutesRes.json()));
    setTodayKey(getBakeryToday());
  }, []);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, bookedMinutesRes] = await Promise.all([
        fetch("/api/admin/schedule-settings"),
        fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemsInCart: [] }),
        }),
      ]);

      if (!settingsRes.ok || !bookedMinutesRes.ok) {
        throw new Error("Failed to fetch schedule data");
      }

      const loadedSettings = (await settingsRes.json()) as Partial<ScheduleSettings>;
      setSettings(loadedSettings);
      savedSettingsRef.current = structuredClone(loadedSettings);
      setAvailability(parseAvailability(await bookedMinutesRes.json()));
      setTodayKey(getBakeryToday());
    } catch (error) {
      console.error(error);
      showAlert("Failed to load schedule data", "error");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    const confirmed = await showConfirmation({
      title: "Update Schedule?",
      body: "Are you sure you want to save these changes?",
      confirmText: "Save",
      variant: "primary",
    });

    if (!confirmed) {
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/schedule-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      savedSettingsRef.current = structuredClone(settings);
      await refreshAvailability();
      showAlert("Settings saved successfully!", "success");
    } catch (error) {
      console.error(error);
      showAlert("Error saving settings", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockToggle = async (
    dateKey: string,
    action: "block" | "unblock"
  ): Promise<boolean> => {
    setBlockingDateKey(dateKey);
    try {
      const res = await fetch("/api/admin/schedule/block-dates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: [dateKey], action }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Failed to update this date");
      }

      setSettings((current) => withBlockChange(current, dateKey, action));
      if (savedSettingsRef.current) {
        savedSettingsRef.current = withBlockChange(
          savedSettingsRef.current,
          dateKey,
          action
        );
      }
      await refreshAvailability();
      showAlert(
        action === "block" ? "Date blocked" : "Date unblocked",
        "success"
      );
      return true;
    } catch (error) {
      console.error(error);
      showAlert(
        error instanceof Error ? error.message : "Failed to update this date",
        "error"
      );
      return false;
    } finally {
      setBlockingDateKey(null);
    }
  };

  const handleInputChange = (key: keyof ScheduleSettings, value: unknown) => {
    let processedValue = value;

    if (key === "leadTimeDays" || key === "defaultWorkMinutes") {
      processedValue = parseInt(String(value), 10) || 0;
    }

    setSettings((prev) => ({
      ...prev,
      [key]: processedValue,
    }));
  };

  const handleOpenWeekdayModal = (day: number) => {
    setSelectedWeekday(day);
    setDraftWeekdaySlots(settings.weekdayHours?.[day] || []);
    setIsWeekdayModalOpen(true);
  };

  const handleSaveWeekdaySlots = () => {
    const updated = { ...(settings.weekdayHours || {}) };
    if (draftWeekdaySlots.length === 0) {
      delete updated[selectedWeekday!];
    } else {
      updated[selectedWeekday!] = draftWeekdaySlots;
    }
    handleInputChange("weekdayHours", updated);
    setIsWeekdayModalOpen(false);
    setSelectedWeekday(null);
  };

  const handleClearWeekday = () => {
    const updated = { ...(settings.weekdayHours || {}) };
    delete updated[selectedWeekday!];
    handleInputChange("weekdayHours", updated);
    setIsWeekdayModalOpen(false);
    setSelectedWeekday(null);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <section className="space-y-6 pb-24">
      <div>
        <h1 className="font-heading text-3xl font-bold text-primary">
          Schedule
        </h1>
        <p className="mt-1 text-sm text-primary/70">
          Block days and see booked versus available minutes. Dates use
          America/Edmonton.
        </p>
      </div>

      <ScheduleWeekdayStrip
        weekdayHours={settings.weekdayHours}
        onSelectDay={handleOpenWeekdayModal}
      />

      <div className="rounded-2xl border border-primary/15 bg-background/20 p-4 shadow-sm backdrop-blur-xl backdrop-saturate-150 sm:p-6">
        <AdminDatePicker
          settings={settings}
          onSettingsChange={setSettings}
          availability={availability}
          todayKey={todayKey}
          onBlockToggle={handleBlockToggle}
          blockingDateKey={blockingDateKey}
          onDayEditorOpenChange={setIsDayEditorOpen}
        />
      </div>

      <CollapsibleSection
        title="Booking rules"
        variant="glass"
        isOpen={rulesOpen}
        onToggle={() => setRulesOpen((open) => !open)}
        className="bg-background/20"
      >
        <div className="space-y-4">
          <DashboardGlassCard className="border-primary/10 bg-background/30">
            <h3 className="font-heading text-base font-semibold text-primary">
              Lead time
            </h3>
            <p className="mt-1 text-sm text-primary/70">
              Minimum days in advance a customer must order.
            </p>
            <label htmlFor="leadTime" className="sr-only">
              Lead time (days)
            </label>
            <Input
              id="leadTime"
              type="number"
              className="mt-3"
              value={settings.leadTimeDays || ""}
              onChange={(event) =>
                handleInputChange("leadTimeDays", event.target.value)
              }
            />
          </DashboardGlassCard>

          <DashboardGlassCard className="border-primary/10 bg-background/30">
            <h3 className="font-heading text-base font-semibold text-primary">
              Default capacity
            </h3>
            <p className="mt-1 text-sm text-primary/70">
              Work minutes available on a typical day before overrides.
            </p>
            <label htmlFor="defaultWorkMinutes" className="sr-only">
              Default work time (minutes/day)
            </label>
            <Input
              id="defaultWorkMinutes"
              type="number"
              className="mt-3"
              value={settings.defaultWorkMinutes || ""}
              onChange={(event) =>
                handleInputChange("defaultWorkMinutes", event.target.value)
              }
            />
          </DashboardGlassCard>

          <DashboardGlassCard className="border-primary/10 bg-background/30">
            <h3 className="font-heading text-base font-semibold text-primary">
              Default pickup slots
            </h3>
            <p className="mt-1 text-sm text-primary/70">
              Used when a weekday chip is set to default and the day has no
              custom slots.
            </p>
            <div className="mt-3">
              <TimeSlotManager
                variant="schedule"
                value={settings.defaultAvailableHours || []}
                onChange={(newHours) =>
                  handleInputChange("defaultAvailableHours", newHours)
                }
              />
            </div>
          </DashboardGlassCard>
        </div>
      </CollapsibleSection>

      <Dialog
        open={isWeekdayModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsWeekdayModalOpen(false);
            setSelectedWeekday(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-primary">
              {selectedWeekday !== null ? WEEKDAYS[selectedWeekday].label : ""}{" "}
              time slots
            </DialogTitle>
            <DialogDescription className="text-sm text-primary/70">
              Slots set here override the default slots for every{" "}
              {selectedWeekday !== null
                ? WEEKDAYS[selectedWeekday].label
                : "selected day"}
              . Leave empty to use defaults.
            </DialogDescription>
          </DialogHeader>
          <TimeSlotManager
            value={draftWeekdaySlots}
            onChange={setDraftWeekdaySlots}
          />
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={handleClearWeekday}
              className="border-red-200 text-red-500 hover:bg-red-50"
            >
              Clear → Use default
            </Button>
            <Button variant="primary" onClick={handleSaveWeekdaySlots}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingActionBar
        isDirty={isDirty && !isDayEditorOpen}
        isSaving={isSaving}
        onDiscard={() => {
          if (savedSettingsRef.current) {
            setSettings(structuredClone(savedSettingsRef.current));
          }
        }}
        onSave={handleSave}
      />
    </section>
  );
};

export default SchedulePage;
