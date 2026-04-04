import { useFormContext, Controller } from "react-hook-form";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { useEffect, useState, useMemo } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { isSameDay, addDays, startOfDay, format } from "date-fns";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";

export default function Step1Availability({ onNext }: { onNext: () => void }) {
  const { control, watch, setValue, formState: { errors } } = useFormContext<CustomOrderFormData>();
  
  const [availability, setAvailability] = useState<{ 
    unavailableDates: string[], 
    leadTimeDays: number,
    defaultAvailableHours: string[],
    dateOverrides: any[]
  } | null>(null);
  const [checkoutSettings, setCheckoutSettings] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Watch the selected date to dynamically show time slots
  const selectedDate = watch("date");
  const selectedTimeSlot = watch("timeSlot");

  // Auto-select the very first mathematically available date
  useEffect(() => {
    if (availability && !selectedDate) {
      let currentDate = addDays(startOfDay(new Date()), availability.leadTimeDays);
      let attempts = 0;
      
      // Advance calendar day by day until we find a date not in the 'unavailableDates' array. Cap at one year to be safe.
      while (
        availability.unavailableDates.includes(format(currentDate, "yyyy-MM-dd")) && 
        attempts < 365
      ) {
         currentDate = addDays(currentDate, 1);
         attempts++;
      }
      
      setValue("date", currentDate, { shouldValidate: true });
    }
  }, [availability, selectedDate, setValue]);

  useEffect(() => {
    async function fetchAvailability() {
      try {
        const [availRes, settingsRes] = await Promise.all([
           fetch("/api/availability"),
           fetch("/api/admin/settings")
        ]);

        if (availRes.ok) {
          const data = await availRes.json();
          // Map to the format CustomDatePicker accepts
          const unavailableArray = [
            ...(data.adminBlockedDates || []),
            ...Object.keys(data.availableMinutesPerDay || {}).filter(date => data.availableMinutesPerDay[date] <= 0)
          ];
          setAvailability({
            unavailableDates: unavailableArray,
            leadTimeDays: data.leadTimeDays || 7, // Default 7 days
            defaultAvailableHours: data.defaultAvailableHours || ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"],
            dateOverrides: data.dateOverrides || []
          });
        }

        if (settingsRes.ok) {
           const settingsData = await settingsRes.json();
           setCheckoutSettings(settingsData.checkout || null);
        }
      } catch (e) {
        console.error("Failed to load availability or settings", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAvailability();
  }, []);

  // Compute the available time slots for the actively selected date
  const availableHoursForSelectedDate = useMemo(() => {
    if (!selectedDate || !availability) return [];
    
    // Check if there is an admin override for this specific calendar day
    const override = availability.dateOverrides.find((o) =>
      isSameDay(new Date(o.date), selectedDate)
    );
    
    if (override && override.availableHours && override.availableHours.length > 0) {
      return override.availableHours;
    }
    return availability.defaultAvailableHours;
  }, [selectedDate, availability]);

  const leadTime = availability?.leadTimeDays ?? 7;
  return (
    <div className="space-y-2">
      <div className="text-center">
        <p className="text-primary/70 mt-2">
          Please select a date at least {leadTime}{" "}
          {leadTime > 1 ? "days" : "day"} in advance.
        </p>
      </div>

      <div className="flex flex-col items-center mt-8">
        {isLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center overflow-hidden">
            <div className="scale-[0.4] -my-32">
              <Spinner />
            </div>
            <p className="text-primary/50 font-semibold animate-pulse -mt-10">
              Checking baker's schedule...
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-6">
            {/* DATE PICKER */}
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <div className="w-full relative">
                  <CustomDatePicker
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                    }}
                    unavailableDates={availability?.unavailableDates || []}
                    leadTimeDays={availability?.leadTimeDays || 7}
                  />
                  {errors.date && (
                    <p className="text-red-500 text-sm mt-3 flex items-center gap-1 font-medium bg-red-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" /> {errors.date.message}
                    </p>
                  )}
                </div>
              )}
            />

            {/* TIME SLOT PICKER (Only shows when a date is clicked) */}
            {selectedDate && (
              <Controller
                control={control}
                name="timeSlot"
                render={({ field }) => (
                  <div className="w-full bg-white/50 backdrop-blur-sm p-4 rounded-xl border shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" /> Available Time
                      Slots
                    </h3>

                    {availableHoursForSelectedDate.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg border border-dashed text-center">
                        No specific time slots available for this day. Please
                        try another date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {availableHoursForSelectedDate.map((slot: string) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              field.onChange(slot);
                              // Auto-advance once the time slot is successfully picked
                              setTimeout(() => onNext(), 300);
                            }}
                            className={`h-11 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                              field.value === slot
                                ? "bg-accent text-white border-accent scale-95 ring-2 ring-accent/20"
                                : "bg-white border text-primary hover:border-accent hover:bg-accent/5"
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* DELIVERY / PICKUP TOGGLE */}
                    {checkoutSettings && (
                      <Controller
                        control={control}
                        name="deliveryMethod"
                        defaultValue="pickup"
                        render={({ field }) => {
                          const isDeliveryEnabled =
                            checkoutSettings.isDeliveryEnabled;

                          // Auto-correct to pickup if delivery was selected but config is disabled
                          if (
                            !isDeliveryEnabled &&
                            field.value === "delivery"
                          ) {
                            field.onChange("pickup");
                          }

                          return (
                            <div className="mt-6 border-t pt-4 border-primary/10">
                              <h3 className="text-sm font-bold text-primary mb-3">
                                Order Delivery/Pickup Method
                              </h3>
                              <div
                                className={`grid grid-cols-1 gap-4 ${isDeliveryEnabled ? "sm:grid-cols-2" : ""}`}
                              >
                                <div
                                  onClick={() => field.onChange("pickup")}
                                  className={cn(
                                    "rounded-xl border p-4 cursor-pointer text-center transition-all flex items-center justify-center gap-2",
                                    field.value === "pickup" || !field.value
                                      ? "border-accent ring-2 ring-accent/20 bg-accent/5 shadow-sm"
                                      : "border-border hover:border-accent hover:bg-accent/5 bg-white",
                                  )}
                                >
                                  <h4 className="font-heading font-bold text-lg text-primary">
                                    Pickup
                                  </h4>
                                </div>

                                {isDeliveryEnabled && (
                                  <div
                                    onClick={() => field.onChange("delivery")}
                                    className={cn(
                                      "rounded-xl border p-4 cursor-pointer text-center transition-all flex items-center justify-center gap-2",
                                      field.value === "delivery"
                                        ? "border-accent ring-2 ring-accent/20 bg-accent/5 shadow-sm"
                                        : "border-border hover:border-accent hover:bg-accent/5 bg-white",
                                    )}
                                  >
                                    <h4 className="font-heading font-bold text-lg text-primary">
                                      Delivery
                                    </h4>
                                  </div>
                                )}
                              </div>
                              {!isDeliveryEnabled && (
                                <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded-xl mt-4 border border-orange-100 flex items-start gap-2 leading-relaxed">
                                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                  {checkoutSettings.disabledMessage ||
                                    "Sorry, we’re not able to offer delivery at the moment."}
                                </p>
                              )}
                            </div>
                          );
                        }}
                      />
                    )}

                    {errors.timeSlot && (
                      <p className="text-red-500 text-sm mt-3 flex items-center gap-1 font-medium bg-red-50 p-2 rounded-lg">
                        <AlertCircle className="w-4 h-4" />{" "}
                        {errors.timeSlot.message}
                      </p>
                    )}
                  </div>
                )}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
