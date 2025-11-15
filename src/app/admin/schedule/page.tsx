"use client";
import { useState, useEffect, useCallback } from "react";
import { ScheduleSettings } from "@/types";
import { ProductCategory } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import AdminDatePicker from "@/components/admin/AdminDatePicker";
import LoadingSpinner from "@/components/ui/Spinner";
import { TimeSlotManager } from "@/components/ui/TimeSlotManager";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";

const SchedulePage = () => {
  const { showAlert } = useAlert()
  const showConfirmation = useConfirmation()
  const [settings, setSettings] = useState<Partial<ScheduleSettings>>({
    leadTimeDays: 3,
    defaultWorkMinutes: 240, 
    dateOverrides: [],
  });
  const [minutesBooked, setMinutesBooked] = useState<Record<string, number>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        ,
      ]);

      if (!settingsRes.ok || !bookedMinutesRes.ok) {
        throw new Error("Failed to fetch schedule data");
      }

      setSettings(await settingsRes.json());
      setMinutesBooked(await bookedMinutesRes.json());
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
      showAlert("Settings saved successfully!", 'success');
    } catch (error) {
      console.error(error);
      showAlert("Error saving settings", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: keyof ScheduleSettings, value: any) => {
    let processedValue = value;

    if (key === "leadTimeDays" || key === "defaultWorkMinutes") {
      processedValue = parseInt(value, 10) || 0;
    }

    setSettings((prev) => ({
      ...prev,
      [key]: processedValue, 
    }));
  };

  const handleBlockedDatesChange = (dates: Date[]) => {
    const newOverrides = dates.map((date) => ({
      date: date,
      isBlocked: true,
    }));
    setSettings((prev) => ({ ...prev, dateOverrides: newOverrides }));
  };

  const blockedDates =
    settings.dateOverrides?.filter((o) => o.isBlocked).map((o) => o.date) || [];

  if (isLoading) return <LoadingSpinner />;

  return (
    <section>
      <h1 className="text-3xl font-bold font-heading mb-6">
        Schedule Management
      </h1>
      <div className=" space-y-6">
        <div className="bg-white p-6 rounded-large shadow">
          <h2 className="text-xl font-semibold font-heading">Booking Rules</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="leadTime" className="block text-sm font-medium">
                Lead Time (days)
              </label>
              <Input
                id="leadTime"
                type="number"
                value={settings.leadTimeDays || ""}
                onChange={(e) =>
                  handleInputChange("leadTimeDays", e.target.value)
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum number of days in advance a customer must order.
              </p>
            </div>
            <div>
              <label htmlFor="orderLimit" className="block text-sm font-medium">
                Default Work Time (minutes/day)
              </label>
              <Input
                id="defaultWorkMinutes"
                type="number"
                value={settings.defaultWorkMinutes || ""}
                onChange={(e) =>
                  handleInputChange("defaultWorkMinutes", e.target.value)
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Defaulut time you can work every day.
              </p>
            </div>
            <div className="bg-card-background p-lg rounded-large shadow-md">
              <h2 className="font-heading text-h3 text-primary">
                Default Time Slots
              </h2>
              <p className="mt-xs font-body text-small text-primary/80 mb-md">
                These are the master time slots available every day.
              </p>
              <TimeSlotManager
                value={settings.defaultAvailableHours || []}
                onChange={(newHours) =>
                  handleInputChange("defaultAvailableHours", newHours)
                }
              />
            </div>
          </div>
        </div>

        {/* Column: Calendar */}
        <div className="bg-card-background p-lg rounded-large shadow-md">
          <h2 className="font-heading text-h3 text-primary">Blocked Dates</h2>
          <p className="mt-xs font-body text-small text-primary/80">
            Select dates when you are unavailable for new orders.
          </p>
          <div className="mt-md">
            <AdminDatePicker
              settings={settings}
              onSettingsChange={setSettings}
              minutesBookedPerDay={minutesBooked}
            />
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </section>
  );
};

export default SchedulePage;
