"use client";

import { isSameDay, format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { CartItem, UniqueCartItem } from "@/types";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/Spinner";
import { extractOriginalItemId } from "@/lib/utils";
import { useAlert } from "@/contexts/AlertContext";


const FormLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <label
    htmlFor={htmlFor}
    className="block font-body text-small text-primary/80 mb-sm"
  >
    {children}
  </label>
);

interface DeliverySchedulerProps {
  // --- Data ---
  availability: any; 
  calculatedUnavailableDates: string[];
  availableHoursForSelectedDate: string[];
  isSplitRequired: boolean;
  unallocatedItems: UniqueCartItem[];
  allocatedDates: { date: Date; itemIds: string[]; timeSlot: string }[];
  items: CartItem[];
  showSplitConfirmation: boolean;

  // --- State & Handlers ---
  selectedDate: Date | undefined;
  selectedTimeSlot: string | undefined;
  popupDate: Date | null;
  openDateSections: string[];
  isProcessing: boolean;
  deliveryMethod: string;
  availableMinutesPerDay: Map<string, number>;
  cartTotalMinutes: number;

  onDateSelect: (date: Date | undefined) => void;
  onTimeSelect: (timeSlot: string) => void;
  onAllocateItem: (item: UniqueCartItem) => void;
  onUnallocateItem: (itemId: string, date: Date) => void;
  onToggleSection: (dateKey: string) => void;
  setPopupDate: (date: Date | null) => void;

  // Handlers for split confirmation
  onConfirmSplit: () => void;
  onRequestConfirmation: () => void;
  onModifyCart: () => void;
}

const DeliveryScheduler = ({
  availability,
  calculatedUnavailableDates,
  availableHoursForSelectedDate,
  isSplitRequired,
  unallocatedItems,
  allocatedDates,
  items,
  showSplitConfirmation,
  selectedDate,
  selectedTimeSlot,
  popupDate,
  openDateSections,
  isProcessing,
  deliveryMethod,
  availableMinutesPerDay,
  cartTotalMinutes,
  onDateSelect,
  onTimeSelect,
  onAllocateItem,
  onUnallocateItem,
  onToggleSection,
  setPopupDate,
  onConfirmSplit,
  onRequestConfirmation,
  onModifyCart,
}: DeliverySchedulerProps) => {
  const { showAlert } = useAlert()
    const handleDateSelect = (date: Date | undefined) => {
      if (!availability) return;

      if (isSplitRequired) {
        onDateSelect(date);
      } else {
        // --- Logic for Single-Date Mode ---
        if (date) {
          const dateStr = format(date, "yyyy-MM-dd");
          const minutesLeftForThisDay = availableMinutesPerDay.get(dateStr);

          if (
            minutesLeftForThisDay === undefined ||
            cartTotalMinutes > minutesLeftForThisDay
          ) {
            showAlert("Not enough capacity for the entire order on this date.", 'error');
            onDateSelect(undefined); 
            return;
          }
          onDateSelect(date);
        } else {
          onDateSelect(undefined);
        }
      }
    };
  return (
    <div className="mt-md">
      <div className="sm:col-span-2 mt-6">
        {/* --- Confirmation Block --- */}
        {showSplitConfirmation ? (
          <div className="p-md border border-warning bg-warning/10 rounded-medium text-center space-y-md">
            <p className="font-body text-warning-dark font-semibold">
              Your order requires too much production time for a single day.
            </p>
            <p className="font-body text-small text-text-secondary">
              Please choose an option:
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-md">
              <Button
                type="button"
                variant="primary"
                onClick={onRequestConfirmation}
                disabled={isProcessing}
              >
                {isProcessing
                  ? "Booking..."
                  : "Buy Anyway (Requires Confirmation)"}
              </Button>
              <Button type="button" variant="primary" onClick={onConfirmSplit}>
                Split Order Across Dates
              </Button>
              <Button type="button" variant="secondary" onClick={onModifyCart}>
                Modify Cart
              </Button>
            </div>
          </div>
        ) : (
          <>
            <FormLabel htmlFor="delivery-date">
              {deliveryMethod === "pickup"
                ? `Select Your Pickup ${isSplitRequired ? "Dates" : "Date"}`
                : `Select Your Delivery ${isSplitRequired ? "Dates" : "Date"} `}
            </FormLabel>
            <div className="mt-1">
              {availability ? (
                <CustomDatePicker
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  unavailableDates={calculatedUnavailableDates}
                  leadTimeDays={availability.leadTimeDays}
                  isSplitRequired={isSplitRequired}
                  popupDate={popupDate}
                  setPopupDate={setPopupDate}
                  unallocatedItems={unallocatedItems}
                  onAllocateItem={onAllocateItem}
                />
              ) : (
                <p>Loading available dates...</p>
              )}
            </div>
          </>
        )}
        {/* --- Unallocated Items List  --- */}
      </div>
      {selectedDate &&
        !showSplitConfirmation &&
        availableHoursForSelectedDate.length > 0 && (
          <div className="mt-md">
          <FormLabel htmlFor="time-slot">Select a Time Slot</FormLabel>
            <div className="flex flex-wrap gap-sm">
              {availableHoursForSelectedDate.map((slot) => (
                <Button
                  type="button"
                  key={slot}
                  variant={selectedTimeSlot === slot ? "primary" : "secondary"}
                  onClick={() => onTimeSelect(slot)}
                  className={cn(
                    "font-body",
                    selectedTimeSlot === slot
                      ? "bg-accent text-white"
                      : "bg-background text-primary hover:bg-subtleBackground"
                  )}
                >
                  {slot}
                </Button>
              ))}
            </div>
          </div>
        )}

      {/* Allocated Items List*/}
      {isSplitRequired && !showSplitConfirmation ? (
        <div className="my-6">
          <h4 className="font-bold mb-md text-primary">Allocated Items</h4>
          {allocatedDates.length > 0 ? (
            <div className="space-y-md">
              {allocatedDates
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((entry) => {
                  const dateKey =
                    format(entry.date, "yyyy-MM-dd") + entry.timeSlot;
                  const isOpen = openDateSections.includes(dateKey);
                  const itemCount = entry.itemIds.length;

                  return (
                    <div key={dateKey}>
                      <button
                        type="button"
                        className="flex items-center justify-between w-full p-sm rounded-medium hover:bg-subtleBackground"
                        onClick={() => onToggleSection(dateKey)}
                      >
                        <p className="font-body font-semibold">
                          {format(entry.date, "EEEE, MMM d")} at{" "}
                          {entry.timeSlot}
                          <span className="ml-sm font-normal text-primary/70">
                            ({itemCount})
                          </span>
                        </p>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-primary/60 transition-transform",
                            isOpen && "rotate-180"
                          )}
                        />
                      </button>

                      {isOpen && (
                        <div className="space-y-sm pl-md border-l-2 border-border ml-sm mt-sm">
                          {entry.itemIds.map((unitId) => {
                            const originalItemId = extractOriginalItemId(unitId);
                            const itemDetails = items.find(
                              (i) => i.id === originalItemId
                            );
                            return (
                              <div
                                key={unitId}
                                className="flex items-center justify-between p-xs bg-card-background rounded-small"
                              >
                                {itemDetails ? (
                                  <div>
                                    <p className="font-body text-small font-bold">
                                      {itemDetails.name}
                                    </p>
                                    <p className="font-body text-xs text-primary/80">
                                      {itemDetails.flavor}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="font-body text-small text-muted-foreground">
                                    Item details not found
                                  </p>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    onUnallocateItem(unitId, entry.date)
                                  }
                                  aria-label={`Remove ${itemDetails?.name || "item"} from ${format(entry.date, "MMM d")}`}
                                >
                                  Remove
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="font-body text-small text-muted-foreground">
              No items allocated yet. Select a date on the calendar to assign
              items.
            </p>
          )}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

export default DeliveryScheduler;
