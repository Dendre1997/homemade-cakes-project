"use client";
// IMPORTS
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cartStore";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { createUnitId, extractOriginalItemId } from "@/lib/utils";
import { useAlert } from "@/contexts/AlertContext";
import {
  isSameDay,
  addDays,
  startOfDay,
  format,
  eachDayOfInterval,
  addMonths,
} from "date-fns";

import PaymentForm from "@/components/PaymentForm";
import OrderSummary from "@/components/(client)/checkout/OrderSummary";
import DeliveryScheduler from "@/components/(client)/checkout/DeliveryScheduler";

import { UniqueCartItem } from "@/types";


// --- Form Label ---
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

/**
 * CheckoutPage manages the multi-step checkout process,
 * including contact info, delivery/pickup selection, and date scheduling.
 *
 * Core Logic:
 * 1. Fetches manufacturing availability from the API.
 * 2. Calculates remaining capacity for each day *on every render* based on
 *    what the user has already allocated in `formData.deliveryDates`.
 * 3. Determines if the order is too large for any single day ("split mode").
 * 4. In "split mode" (`isSplitRequired`), it "explodes" cart items into
 *    individual units (`unallocatedItems`) that must be manually
 *    scheduled by the user.
 * 5. In "single date mode," it assigns the *entire* cart to one valid date.
 */

const CheckoutPage = () => {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { showAlert } = useAlert()

  // --- Core State ---
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    deliveryMethod: "delivery",
    deliveryDates: [] as { date: Date; itemIds: string[]; timeSlot: string }[],
  });
  const [availability, setAvailability] = useState<{
    leadTimeDays: number;
    manufacturingTimes: { [key: string]: number };
    availableMinutesPerDay: Record<string, number>;
    adminBlockedDates: string[];
    defaultAvailableHours: string[];
    dateOverrides: { date: Date; availableHours?: string[] }[];
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [unallocatedItems, setUnallocatedItems] = useState<UniqueCartItem[]>(
    []
  );
  const [isSplitRequired, setIsSplitRequired] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [popupDate, setPopupDate] = useState<Date | null>(null);
  const [showSplitConfirmation, setShowSplitConfirmation] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>(
    undefined
  );
  const [openDateSections, setOpenDateSections] = useState<string[]>([]);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) setAvailability(await res.json());
      } catch (error) {
        console.error("Failed to fetch availability", error);
      }
    };
    fetchAvailability();
    setIsMounted(true);
  }, [isMounted]);

  // --- DIRECT CALCULATIONS (Run on every render) ---
  
  let calculatedUnavailableDates: string[] = [];
  let availableMinutesPerDay = new Map<string, number>();
  let initialAvailableMinutes = new Map<string, number>();
  let cartTotalMinutes = 0;
  let needsSplit = false;

  if (availability && items.length > 0) {
    const {
      leadTimeDays,
      manufacturingTimes,
      availableMinutesPerDay: apiAvailableMinutes,
      adminBlockedDates,
    } = availability;

    cartTotalMinutes = items.reduce(
      (sum, item) =>
        sum + (manufacturingTimes[item.categoryId] || 0) * item.quantity,
      0
    );

    initialAvailableMinutes = new Map(Object.entries(apiAvailableMinutes));
    availableMinutesPerDay = new Map(Object.entries(apiAvailableMinutes));

    formData.deliveryDates.forEach((dd) => {
      const dateString = format(dd.date, "yyyy-MM-dd");
      const timeAllocated = dd.itemIds.reduce((sum, unitId) => {
        const parts = unitId.split("-");
        const originalItemId = extractOriginalItemId(unitId);

        const originalItem = items.find((i) => i.id === originalItemId); 
        const itemTime = originalItem
          ? manufacturingTimes[originalItem.categoryId] || 0
          : 0;
        
        return sum + itemTime;
      }, 0);

      const currentMins = availableMinutesPerDay.get(dateString) || 0;
      
      availableMinutesPerDay.set(dateString, currentMins - timeAllocated);
    });

    const maxAvailableSlot = Math.max(
      0,
      ...Array.from(availableMinutesPerDay.values())
    );
    needsSplit = cartTotalMinutes > maxAvailableSlot;

    if (needsSplit && !isSplitRequired && !showSplitConfirmation) {
      Promise.resolve().then(() => setShowSplitConfirmation(true)); 
    } else if (!needsSplit && (isSplitRequired || showSplitConfirmation)) {
      Promise.resolve().then(() => {
        setShowSplitConfirmation(false);
        setIsSplitRequired(false);
      });
      // setTimeout(() => { // Alternative
      //    setShowSplitConfirmation(false);
      //    setIsSplitRequired(false);
      // }, 0);
    }

    const newUnavailableSet = new Set<string>();
    adminBlockedDates.forEach((ds) => newUnavailableSet.add(ds));
    initialAvailableMinutes.forEach((initialMinutes, dateString) => {
      const minutesLeft = availableMinutesPerDay.get(dateString);
      if (minutesLeft !== undefined && minutesLeft <= 0) {
        newUnavailableSet.add(dateString);
      } else if (!needsSplit && cartTotalMinutes > initialMinutes) {
        newUnavailableSet.add(dateString);
      }
    });


    // lead time days
    const today = startOfDay(new Date());
    const firstAvailableDate = addDays(today, leadTimeDays);
    eachDayOfInterval({
      start: today,
      end: addDays(firstAvailableDate, -1),
    }).forEach((d) => {
      newUnavailableSet.add(format(d, "yyyy-MM-dd"));
    });

    calculatedUnavailableDates = Array.from(newUnavailableSet);

  } else if (items.length === 0 && isSplitRequired) {
    // setIsSplitRequired(false);
    if (isSplitRequired)
      Promise.resolve().then(() => setIsSplitRequired(false));
    if (showSplitConfirmation)
      Promise.resolve().then(() => setShowSplitConfirmation(false));
  }

  // --- Effect to Update isSplitRequired State ---

  useEffect(() => {
    let currentNeedsSplit = false;
    if (availability && items.length > 0) {
      const currentAvailableMinutes = new Map(
        Object.entries(availability.availableMinutesPerDay)
      );
      formData.deliveryDates.forEach((dd) => {
        const dateString = format(dd.date, "yyyy-MM-dd");
        const timeAllocated = dd.itemIds.reduce((sum, unitId) => {
          const parts = unitId.split("-");
          const originalItemId = parts.slice(0, -1).join("-");
          
          const originalItem = items.find((i) => i.id === originalItemId);
          return (
            sum +
            (originalItem
              ? availability.manufacturingTimes[originalItem.categoryId] || 0
              : 0)
          );
        }, 0);
        currentAvailableMinutes.set(
          dateString,
          (currentAvailableMinutes.get(dateString) || 0) - timeAllocated
        );
      });

      const currentCartTotal = items.reduce(
        (sum, item) =>
          sum +
          (availability.manufacturingTimes[item.categoryId] || 0) *
            item.quantity,
        0
      );
      const currentMaxSlot = Math.max(
        0,
        ...Array.from(currentAvailableMinutes.values())
      );
      currentNeedsSplit = currentCartTotal > currentMaxSlot;
    }

    if (currentNeedsSplit !== isSplitRequired) {

      setIsSplitRequired(currentNeedsSplit);
    }
  }, [availability, items, formData.deliveryDates, isSplitRequired]);

  // --- Effect for managing unallocatedItems ---

  useEffect(() => {
    if (!isSplitRequired || items.length === 0) {
      setUnallocatedItems([]);
      return;
    }
    if (!availability) return;
    const allItemsAsUnits: UniqueCartItem[] = items.flatMap((item) =>
      Array(item.quantity)
        .fill(null)
        .map((_, unitIndex) => ({
          ...item,
          quantity: 1,
          uniqueId: createUnitId(item.id, unitIndex),
          id: item.id,
          time: availability.manufacturingTimes[item.categoryId] || 0,
        }))
    );
    setUnallocatedItems(allItemsAsUnits);
    setFormData((prev) =>
      prev.deliveryDates.length > 0 ? { ...prev, deliveryDates: [] } : prev
    );
    setSelectedDate(undefined);
  }, [isSplitRequired, items, availability]);



  // --- Event Handlers ---
  const handleAllocateItem = (itemToAllocate: UniqueCartItem) => {
    if (!selectedDate || !availability) return;

    if (!selectedDate) {
      showAlert("Please pick a date from the calendar first", "error");
      return;
    }

    if (!selectedTimeSlot) {
      showAlert(
        `Please choose a ${formData.deliveryMethod} time for this date`,
        "error"
      );
      return;
    }

    const itemTime =
      availability.manufacturingTimes[itemToAllocate.categoryId] || 0;
    const dateString = format(selectedDate, "yyyy-MM-dd");
    const minutesLeft = availableMinutesPerDay.get(dateString);

    if (minutesLeft === undefined || itemTime > minutesLeft) {
      showAlert("Oops! We’re all booked up for that date", "error");
      return;
    }

    setFormData((prev) => {
      const entryIndex = prev.deliveryDates.findIndex(
        (d) =>
          isSameDay(d.date, selectedDate!) && d.timeSlot === selectedTimeSlot
      );

      let newDeliveryDates;

      if (entryIndex > -1) {
        newDeliveryDates = prev.deliveryDates.map((d, index) =>
          index === entryIndex
            ? { ...d, itemIds: [...d.itemIds, itemToAllocate.uniqueId] }
            : d
        );
      } else {
        newDeliveryDates = [
          ...prev.deliveryDates,
          {
            date: selectedDate!,
            itemIds: [itemToAllocate.uniqueId],
            timeSlot: selectedTimeSlot,
          },
        ];
      }
      return { ...prev, deliveryDates: newDeliveryDates };
    });

    setUnallocatedItems((prev) =>
      prev.filter((item) => item.uniqueId !== itemToAllocate.uniqueId)
    );
    // setSelectedDate(undefined);
    // setSelectedTimeSlot(undefined);
  };

  const handleUnallocateItem = (
    unitIdToRemove: string,
    dateToRemoveFrom: Date
  ) => {
    setFormData((prev) => {
      const newDeliveryDates = prev.deliveryDates
        .map((entry) => {
          if (isSameDay(entry.date, dateToRemoveFrom)) {
            const newItemIds = entry.itemIds.filter(
              (id) => id !== unitIdToRemove
            );
            return { ...entry, itemIds: newItemIds };
          }
          return entry;
        })
        .filter((entry) => entry.itemIds.length > 0); 
      
      return { ...prev, deliveryDates: newDeliveryDates };
    });

    const originalItemId = extractOriginalItemId(unitIdToRemove);
    const originalItem = items.find((i) => i.id === originalItemId);

    if (originalItem) {
      const itemToAddBack: UniqueCartItem = {
        ...originalItem,
        quantity: 1,
        uniqueId: unitIdToRemove,
        id: originalItem.id,
        time: availability?.manufacturingTimes[originalItem.categoryId] || 0,
      };
      setUnallocatedItems((prev) => [...prev, itemToAddBack]);
    } else {
      console.error(
        "Could not find original item details to unallocate:",
        unitIdToRemove
      );
    }
  };

  // Handle clicking a date on the calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (isSplitRequired) {
      setSelectedDate(date);
    } else {
      setSelectedDate(date);
      setSelectedTimeSlot(undefined);
      setFormData((prev) => ({ ...prev, deliveryDates: [] }));
    }
  };

  

  const availableHoursForSelectedDate = useMemo(() => {
    if (!selectedDate || !availability) return [];

    const override = availability.dateOverrides.find((o) =>
      isSameDay(new Date(o.date), selectedDate)
    );

    if (override && override.availableHours) {
      return override.availableHours;
    }

    return availability.defaultAvailableHours;
  }, [selectedDate, availability]);



  const handleTimeSlotSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);

    if (isSplitRequired) {
      return;
    }

    if (!selectedDate || !availability) {
      showAlert("Please pick a date from the calendar first", "error");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const minutesLeftForThisDay = availableMinutesPerDay.get(dateStr);

    if (
      minutesLeftForThisDay === undefined ||
      cartTotalMinutes > minutesLeftForThisDay
    ) {
      showAlert("Oops! We’re all booked up for that date", "error");
      return;
    }

    const allUnitIds = items.flatMap((item, i) =>
      Array(item.quantity)
        .fill(null)
        .map((_, idx) => createUnitId(item.id, idx))
    );

    setFormData((prev) => ({
      ...prev,
      deliveryDates: [
        {
          date: selectedDate,
          timeSlot: timeSlot,
          itemIds: allUnitIds,
        },
      ],
    }));
  };

  const toggleDateSection = (dateKey: string) => {
    setOpenDateSections(
      (prevOpenDates) =>
        prevOpenDates.includes(dateKey)
          ? prevOpenDates.filter((key) => key !== dateKey) // Close it
          : [...prevOpenDates, dateKey] // Open it
    );
  };
  const handleConfirmSplit = () => {
    setIsSplitRequired(true); 
    setShowSplitConfirmation(false);
    setPopupDate(null);
    setSelectedDate(undefined); 
    
  };

  // --- Other Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );



  const handleRequestConfirmation = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      setError("Please fill in your contact information first.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (
      formData.deliveryMethod === "delivery" &&
      (!formData.address ||
        !formData.city ||
        !formData.province ||
        !formData.postalCode)
    ) {
      setError("Please fill in your complete delivery address.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsProcessing(true);
    setError(null);
    const orderData = {
      customerInfo: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      },
      deliveryInfo: {
        method: formData.deliveryMethod,
        address:
          formData.deliveryMethod === "delivery"
            ? `${formData.address}, ${formData.city}, ${formData.province}, ${formData.postalCode}`
            : "Pickup",
        deliveryDates: [],
      },
      items,
      totalAmount: subtotal,
      status: "pending_confirmation",
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); 
        throw new Error(
          errorData.message || "Failed to submit order for confirmation."
        );
      }

      const result = await response.json();

      clearCart();
      setCompletedOrderId(result.orderId)
      showAlert(
        "Thank you! Your order request has been received. The baker will contact you soon to confirm the details and dates.", 'success'
      );
      router.push(`orders/thank-you?orderId=${result.orderId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setIsProcessing(false);
    }
  };

  

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (step === 1) {
      if (formData.deliveryDates.length === 0) {
        setError("Please select a delivery or pickup date & time.");
        return;
      }
      if (formData.deliveryDates.length === 0) {
        setError("Please select a delivery or pickup date & time.");
        return;
      }
      if (isSplitRequired && unallocatedItems.length > 0) {
        setError("Please allocate all your items to a date before proceeding.");
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    setIsProcessing(true);
    setError(null);

    const orderData = {
      customerInfo: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      },
      deliveryInfo: {
        method: formData.deliveryMethod,
        address:
          formData.deliveryMethod === "delivery"
            ? `${formData.address}, ${formData.city}, ${formData.province}, ${formData.postalCode}`
            : "Pickup",
        deliveryDates: formData.deliveryDates,
      },
      items,
      totalAmount: subtotal,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok)
        throw new Error("Something went wrong placing the order.");

      const result = await response.json();
      clearCart();
      setCompletedOrderId(result.orderId);
      router.push(`orders/thank-you?orderId=${result.orderId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMounted)
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="bg-background min-h-screen">
      <main className="mx-auto max-w-7xl px-lg py-xl">
        {items.length === 0 && !completedOrderId ? (
          <div className="py-xxl text-center">
            <h2 className="font-heading text-h2 text-primary">
              Your cart is empty
            </h2>
            <div className="mt-lg">
              <Link href="/products">
                <Button variant="secondary">Continue Shopping &rarr;</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="text-center font-body text-primary/80 mb-lg">
              Step {step} of 2
            </div>
            <div className="grid grid-cols-1 gap-x-xl gap-y-lg lg:grid-cols-3">
              {/* ---  Form Steps --- */}
              <div className="lg:col-span-2 space-y-lg">
                {step === 1 && (
                  <div>
                    <h2 className="font-heading text-h3 text-primary">
                      Contact & Delivery
                    </h2>
                    <div className="mt-md space-y-md">
                      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                        <div>
                          <FormLabel htmlFor="name">Name</FormLabel>
                          <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <FormLabel htmlFor="email">Email</FormLabel>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <FormLabel htmlFor="phone">Phone</FormLabel>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <h3 className="mt-lg font-heading text-h3 text-primary">
                      Delivery Method
                    </h3>
                    <div className="mt-md grid grid-cols-1 gap-md sm:grid-cols-2">
                      <div
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            deliveryMethod: "pickup",
                          }))
                        }
                        className={cn(
                          "rounded-medium border p-md cursor-pointer",
                          formData.deliveryMethod === "pickup"
                            ? "border-accent ring-2 ring-accent"
                            : "border-border"
                        )}
                      >
                        <h4 className="font-body font-bold">Pickup</h4>
                      </div>
                      <div
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            deliveryMethod: "delivery",
                          }))
                        }
                        className={cn(
                          "rounded-medium border p-md cursor-pointer",
                          formData.deliveryMethod === "delivery"
                            ? "border-accent ring-2 ring-accent"
                            : "border-border"
                        )}
                      >
                        <h4 className="font-body font-bold">Delivery</h4>
                      </div>
                    </div>
                    {formData.deliveryMethod === "delivery" && (
                      <div className="mt-md space-y-md">
                        <FormLabel htmlFor="address">
                          Shipping Address
                        </FormLabel>
                        <Input
                          id="address"
                          type="text"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="123 Main St"
                          required
                        />
                        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
                          <Input
                            id="city"
                            type="text"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="City"
                            required
                          />
                          <Input
                            id="province"
                            type="text"
                            value={formData.province}
                            onChange={handleInputChange}
                            placeholder="Province"
                            required
                          />
                          <Input
                            id="postalCode"
                            type="text"
                            value={formData.postalCode}
                            onChange={handleInputChange}
                            placeholder="Postal Code"
                            required
                          />
                        </div>
                      </div>
                    )}
                    <DeliveryScheduler
                      availability={availability}
                      calculatedUnavailableDates={calculatedUnavailableDates}
                      availableHoursForSelectedDate={
                        availableHoursForSelectedDate
                      }
                      isSplitRequired={isSplitRequired}
                      unallocatedItems={unallocatedItems}
                      allocatedDates={formData.deliveryDates}
                      items={items}
                      showSplitConfirmation={showSplitConfirmation}
                      selectedDate={selectedDate}
                      selectedTimeSlot={selectedTimeSlot}
                      popupDate={popupDate}
                      openDateSections={openDateSections}
                      isProcessing={isProcessing}
                      deliveryMethod={formData.deliveryMethod}
                      onDateSelect={handleDateSelect}
                      onTimeSelect={handleTimeSlotSelect}
                      onAllocateItem={handleAllocateItem}
                      onUnallocateItem={handleUnallocateItem}
                      onToggleSection={toggleDateSection}
                      setPopupDate={setPopupDate}
                      onConfirmSplit={handleConfirmSplit}
                      onRequestConfirmation={handleRequestConfirmation}
                      onModifyCart={() => router.push("/cart")}
                      availableMinutesPerDay={availableMinutesPerDay}
                      cartTotalMinutes={cartTotalMinutes}
                    />
                  </div>
                )}
                {step === 2 && <PaymentForm />}
              </div>

              {/* --- Right Column: Order Summary --- */}
              <div className="lg:col-span-1">
                <div className="lg:col-span-1">
                  <OrderSummary />
                </div>
              </div>
            </div>

            {/* --- Action Buttons --- */}
            <div className="mt-xl pt-lg border-t border-border flex items-center justify-between">
              <Button
                variant="text"
                onClick={() => (step === 2 ? setStep(1) : router.push("/cart"))}
              >
                &larr; {step === 2 ? "Back to Delivery" : "Back to Cart"}
              </Button>
              <Button type="submit" variant="primary" disabled={isProcessing}>
                {isProcessing ? (
                  <p>Processing...</p>
                ) : step === 1 ? (
                  "Proceed to Payment"
                ) : (
                  "Pay for Order"
                )}
              </Button>
            </div>
            {error && <p className="mt-md text-center text-error">{error}</p>}
          </form>
        )}
      </main>
    </div>
  );
};

export default CheckoutPage;

































