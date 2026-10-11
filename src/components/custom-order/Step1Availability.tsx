import { useFormContext, Controller } from "react-hook-form";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { useEffect, useState, useMemo, useRef } from "react";
import { AlertCircle, Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { isSameDay, addDays, startOfDay, format } from "date-fns";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";

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

export default function Step1Availability({ onNext }: { onNext: () => void }) {
  const { control, watch, setValue, formState: { errors } } = useFormContext<CustomOrderFormData>();
  
  const [availability, setAvailability] = useState<{
    unavailableDates: string[];
    leadTimeDays: number;
    defaultAvailableHours: string[];
    weekdayHours?: Record<number, string[]>;
    dateOverrides: any[];
  } | null>(null);
  const [checkoutSettings, setCheckoutSettings] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Watch the selected date to dynamically show time slots
  const selectedDate = watch("date");
  const selectedTimeSlot = watch("timeSlot");
  const deliveryMethod = watch("deliveryMethod");

  useEffect(() => {
    if (
      checkoutSettings &&
      !checkoutSettings.isDeliveryEnabled &&
      deliveryMethod === "delivery"
    ) {
      setValue("deliveryMethod", "pickup");
    }
  }, [checkoutSettings, deliveryMethod, setValue]);

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
        const [blocksRes, settingsRes] = await Promise.all([
          fetch("/api/shop/calendar-blocks"),
          fetch("/api/shop/availability-settings"),
        ]);

        if (blocksRes.ok) {
          const data = await blocksRes.json();
          setAvailability({
            unavailableDates: data.blockedDates ?? [],
            leadTimeDays: data.leadTimeDays ?? "",
            defaultAvailableHours: data.defaultAvailableHours?.length
              ? data.defaultAvailableHours
              : ["8:00 AM", "6:00 PM", "7:00 PM", "7:00 AM"],
            weekdayHours: data.weekdayHours,
            dateOverrides: data.dateOverrides ?? [],
          });
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setCheckoutSettings(settingsData.checkout ?? null);
        }
      } catch (e) {
        console.error("Failed to load calendar data", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAvailability();
  }, []);

  // Compute the available time slots for the actively selected date
  const availableHoursForSelectedDate = useMemo(() => {
    if (!selectedDate || !availability) return [];

    // Priority 1: dateOverride for this specific date
    const override = availability.dateOverrides.find((o) =>
      isSameDay(new Date(o.date), selectedDate)
    );
    if (override?.availableHours && override.availableHours.length > 0) {
      return [...override.availableHours].sort((a, b) => parseTime(a) - parseTime(b));
    }

    // Priority 2: weekdayHours for this day of week
    const dayOfWeek = selectedDate.getDay(); // 0=Sunday...6=Saturday
    const weekdaySlots = availability.weekdayHours?.[dayOfWeek];
    if (weekdaySlots && weekdaySlots.length > 0) {
      return [...weekdaySlots].sort((a, b) => parseTime(a) - parseTime(b));
    }

    // Priority 3: defaultAvailableHours fallback
    return [...availability.defaultAvailableHours].sort((a, b) => parseTime(a) - parseTime(b));
  }, [selectedDate, availability]);

  const [carouselIndex, setCarouselIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const visibleCount = 3;

  const uniqueDotIndices = useMemo(() => {
    const indices: number[] = [];
    const maxIdx = Math.max(0, availableHoursForSelectedDate.length - visibleCount);
    for (let i = 0; i < availableHoursForSelectedDate.length; i += visibleCount) {
      indices.push(Math.min(i, maxIdx));
    }
    return Array.from(new Set(indices));
  }, [availableHoursForSelectedDate.length, visibleCount]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setCarouselIndex(i => Math.min(availableHoursForSelectedDate.length - visibleCount, i + visibleCount));
      else setCarouselIndex(i => Math.max(0, i - visibleCount));
    }
  };

  useEffect(() => {
    setCarouselIndex(0);
  }, [selectedDate]);

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
                <div className="w-full relative" data-field-name="date">
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
                  <div
                    data-field-name="timeSlot"
                    className="w-full bg-white/50 backdrop-blur-sm p-4 rounded-xl border shadow-sm animate-in fade-in slide-in-from-top-4 duration-500"
                  >
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
                      <div className="relative">
                        {/* Navigation buttons */}
                        <button
                          type="button"
                          aria-label="Previous time slots"
                          onClick={() =>
                            setCarouselIndex((i) =>
                              Math.max(0, i - visibleCount),
                            )
                          }
                          disabled={carouselIndex === 0}
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center disabled:opacity-30 hover:border-accent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                        >
                          <ChevronLeft className="w-4 h-4 text-primary" aria-hidden="true" />
                        </button>

                        {/* Slots track */}
                        <div
                          className="overflow-hidden"
                          ref={trackRef}
                          onTouchStart={handleTouchStart}
                          onTouchEnd={handleTouchEnd}
                        >
                          <div
                            className="flex transition-transform duration-300 ease-in-out"
                            style={{
                              transform: `translateX(-${carouselIndex * 50}%)`,
                            }}
                          >
                            {availableHoursForSelectedDate.map(
                              (slot: string) => (
                                <div
                                  key={slot}
                                  className="flex-shrink-0 basis-1/2 px-1"
                                >
                                  <button
                                    type="button"
                                    aria-pressed={field.value === slot}
                                    onClick={() => field.onChange(slot)}
                                    className={`w-full h-20 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 
            flex items-center justify-center text-center
            leading-tight transition-all shadow-sm
            ${
              field.value === slot
                ? "bg-accent text-white border-accent ring-2 ring-accent/20"
                : "bg-white border text-primary hover:border-accent hover:bg-accent/5"
            }`}
                                  >
                                    <span>
                                      {slot.split(" - ")[0]} <br />
                                      {slot.split(" - ")[1]}
                                    </span>
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label="Next time slots"
                          onClick={() =>
                            setCarouselIndex((i) =>
                              Math.min(
                                availableHoursForSelectedDate.length -
                                  visibleCount,
                                i + visibleCount,
                              ),
                            )
                          }
                          disabled={
                            carouselIndex >=
                            availableHoursForSelectedDate.length - visibleCount
                          }
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center disabled:opacity-30 hover:border-accent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                        >
                          <ChevronRight className="w-4 h-4 text-primary" aria-hidden="true" />
                        </button>

                        {/* Dots */}
                        <div className="flex justify-center gap-1.5 mt-3">
                          {uniqueDotIndices.map((targetIndex, i) => (
                            <button
                              key={i}
                              type="button"
                              aria-label={`Show time slots ${i + 1}`}
                              aria-current={
                                carouselIndex === targetIndex ? "true" : undefined
                              }
                              onClick={() => setCarouselIndex(targetIndex)}
                              className={`w-1.5 h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                                carouselIndex === targetIndex
                                  ? "bg-accent w-3"
                                  : "bg-gray-300"
                              }`}
                            />
                          ))}
                        </div>
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
                          const pickupSelected =
                            field.value === "pickup" || !field.value;

                          return (
                            <div className="mt-6 border-t pt-4 border-primary/10">
                              <h3 className="text-sm font-bold text-primary mb-3">
                                Order Delivery/Pickup Method
                              </h3>

                              {pickupSelected &&
                                checkoutSettings?.pickupAddress?.trim() !==
                                  "" && (
                                  <div className="mb-4 p-3 bg-accent/5 rounded-lg border border-accent/20 text-sm text-primary/80 flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                                    <div>
                                      <span className="font-semibold block mb-0.5">
                                        Pickup Location:
                                      </span>
                                      Calgary (East Village area)
                                    </div>
                                  </div>
                                )}

                              <div
                                role="radiogroup"
                                aria-label="Order delivery or pickup method"
                                className={`grid grid-cols-1 gap-4 ${isDeliveryEnabled ? "sm:grid-cols-2" : ""}`}
                              >
                                <label
                                  className={cn(
                                    "rounded-xl border p-4 cursor-pointer text-center transition-all flex items-center justify-center gap-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2",
                                    pickupSelected
                                      ? "border-accent ring-2 ring-accent/20 bg-accent/5 shadow-sm"
                                      : "border-border hover:border-accent hover:bg-accent/5 bg-white",
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name="custom-order-delivery-method"
                                    value="pickup"
                                    checked={pickupSelected}
                                    onChange={() => field.onChange("pickup")}
                                    className="sr-only"
                                  />
                                  <span className="font-heading font-bold text-lg text-primary">
                                    Pickup
                                  </span>
                                </label>

                                {isDeliveryEnabled && (
                                  <label
                                    className={cn(
                                      "rounded-xl border p-4 cursor-pointer text-center transition-all flex items-center justify-center gap-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2",
                                      field.value === "delivery"
                                        ? "border-accent ring-2 ring-accent/20 bg-accent/5 shadow-sm"
                                        : "border-border hover:border-accent hover:bg-accent/5 bg-white",
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name="custom-order-delivery-method"
                                      value="delivery"
                                      checked={field.value === "delivery"}
                                      onChange={() => field.onChange("delivery")}
                                      className="sr-only"
                                    />
                                    <span className="font-heading font-bold text-lg text-primary">
                                      Delivery
                                    </span>
                                  </label>
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
