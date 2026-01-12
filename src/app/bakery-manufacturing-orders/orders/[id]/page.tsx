"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Order, Diameter, OrderStatus, ScheduleSettings } from "@/types"; // Import OrderStatus
import Link from "next/link";
import LoadingSpinner from "@/components/ui/Spinner";
import OrderDetailAssignedDates from "@/components/admin/orders/OrderDetailAssignedDates";
import { useAlert } from "@/contexts/AlertContext";
import {
  format,
  startOfDay,
  isSameDay
} from "date-fns";
import { CartItem } from "@/types";
import { extractOriginalItemId } from "../../../../lib/utils";
import OrderDetailItems from "@/components/admin/orders/OrderDetailItems";
import OrderDetailCustomer from "@/components/admin/orders/OrderDetailCustomer";
import { OrderDetailActions } from "@/components/admin/orders/OrderDetailActions";
import { OrderNotesSection } from "@/components/admin/orders/OrderNotesSection";
import { useConfirmation } from "@/contexts/ConfirmationContext";
interface AvailabilityData {
  leadTimeDays: number;
  manufacturingTimes: { [key: string]: number };
  availableMinutesPerDay: Record<string, number>;
  adminBlockedDates: string[];
  defaultWorkMinutes: number;
  dateOverrides: { date: string; workMinutes?: number; isBlocked?: boolean }[];
}

const OrderDetailsPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();

  // --- States ---
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [availabilityData, setAvailabilityData] =
    useState<AvailabilityData | null>(null);
  const [capacityPercentages, setCapacityPercentages] = useState<
    Record<string, number>
  >({});
  const [adminSelectedSingleDate, setAdminSelectedSingleDate] =
    useState<Date | null>(null);
  const [isConfirmingDate, setIsConfirmingDate] = useState(false);
  const [editMode, setEditMode] = useState<"single" | "split" | null>(null);
  const [editedDeliveryDates, setEditedDeliveryDates] = useState<
    { date: Date; itemIds: string[] }[]
  >([]);
  const [adminUnallocatedItems, setAdminUnallocatedItems] = useState<
    CartItem[]
  >([]);
  const [adminPopupDate, setAdminPopupDate] = useState<Date | null>(null);
  const [minutesBooked, setMinutesBooked] = useState<
    { _id: string; totalMinutes: number }[]
  >([]);
  const [settings, setSettings] = useState<Partial<ScheduleSettings> | null>(
    null
  );

  // --- Data Fetching ---
  const fetchOrderAndDiameters = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [orderRes, diametersRes] = await Promise.all([
        fetch(`/api/admin/orders/${id}`),
        fetch("/api/admin/diameters"),
      ]);

      if (!orderRes.ok)
        throw new Error(`Failed to fetch order: ${orderRes.statusText}`);
      if (!diametersRes.ok)
        throw new Error(
          `Failed to fetch diameters: ${diametersRes.statusText}`
        );

      const orderData = await orderRes.json();
      setOrder(orderData);
      setNewStatus(orderData.status);
      setDiameters(await diametersRes.json());

      setAdminSelectedSingleDate(null);
      setIsConfirmingDate(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        console.log("Fetching availability data for admin...");
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch availability data");
        const data: AvailabilityData = await res.json();
        console.log("Availability data received:", data);
        setAvailabilityData(data);
      } catch (err) {
        console.error("Error fetching availability:", err);
        setError((prev) =>
          prev
            ? `${prev}, Failed to load availability`
            : "Failed to load availability"
        );
      }
    };
    fetchAvailability();
  }, []);

  useEffect(() => {
    if (!availabilityData) {
      setCapacityPercentages({});
      return;
    }
    console.log("Calculating capacity percentages...");

    const percentages: Record<string, number> = {};
    const { availableMinutesPerDay, defaultWorkMinutes, dateOverrides } =
      availabilityData;

    const overridesMap = new Map(
      dateOverrides.map((o) => [
        format(startOfDay(new Date(o.date)), "yyyy-MM-dd"),
        o,
      ])
    );

    Object.keys(availableMinutesPerDay).forEach((dateString) => {
      const override = overridesMap.get(dateString);
      const totalMinutes = override?.workMinutes ?? defaultWorkMinutes;
      const availableMinutes = availableMinutesPerDay[dateString] ?? 0;

      if (totalMinutes > 0) {
        const bookedMinutes = totalMinutes - availableMinutes;
        percentages[dateString] = Math.max(
          0,
          (bookedMinutes / totalMinutes) * 100
        );
      } else {
        percentages[dateString] = 100;
      }
    });
    console.log("Capacity percentages calculated:", percentages);
    setCapacityPercentages(percentages);
  }, [availabilityData]);

  useEffect(() => {
    fetchOrderAndDiameters();
  }, [fetchOrderAndDiameters]);

  // --- Handlers ---
  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === order?.status) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      showAlert("Status updated successfully!", "success");
      fetchOrderAndDiameters();
    } catch (error) {
      console.error(error);
      showAlert("Error updating status", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEditDates = () => {
    const enteringEditMode = !isEditingDates;
    setIsEditingDates(enteringEditMode);

    if (enteringEditMode) {
      setEditMode(null);
      setAdminSelectedSingleDate(null);
      setEditedDeliveryDates([]);
      setAdminUnallocatedItems([]);
      setAdminPopupDate(null);
      setError(null);
    } else {
      setEditMode(null);
      setAdminSelectedSingleDate(null);
    }
  };

  const handleSetEditModeSingle = () => {
    setEditMode("single");
    setEditedDeliveryDates([]);
    setAdminUnallocatedItems([]);
    setAdminPopupDate(null);
  };

  const handleSetEditModeSplit = () => {
    setEditMode("split");
    // Initialize split edit state
    const currentDates =
      order?.deliveryInfo.deliveryDates.map((d) => ({
        ...d,
        date: new Date(d.date),
      })) || [];
    setEditedDeliveryDates(currentDates);

    if (order && availabilityData) {
      const allPossibleUnitItems = order.items.flatMap((item) =>
        Array(item.quantity)
          .fill(null)
          .map((_, unitIndex) => ({
            ...item,
            quantity: 1,
            id: `${item.id}-${unitIndex}`,

            productId: item.productId?.toString(),
            categoryId: item.categoryId?.toString(),
            diameterId: item.diameterId?.toString(),
          }))
      );
      const allocatedIds = new Set(currentDates.flatMap((d) => d.itemIds));
      setAdminUnallocatedItems(
        allPossibleUnitItems.filter((item) => !allocatedIds.has(item.id))
      );
    } else {
      setAdminUnallocatedItems([]);
    }
    setAdminSelectedSingleDate(null);
    setAdminPopupDate(null); 
  };

  const handleBackToModeSelection = () => {
    setEditMode(null);
    setAdminSelectedSingleDate(null);
    setEditedDeliveryDates([]);
    setAdminUnallocatedItems([]);
    setAdminPopupDate(null);
  };

  // Handle Single Date Save
  const handleSaveSingleDate = async () => {
    if (!adminSelectedSingleDate || !order || !availabilityData) {
      showAlert("Please select a new date first.", "warning");
      return;
    }

    setError(null);
    try {
      const orderTotalMinutes = order.items.reduce(
        (sum, item) =>
          sum +
          (item.categoryId ? (availabilityData.manufacturingTimes[item.categoryId.toString()] || 0) : 0) *
            item.quantity,
        0
      );
      const dateStr = format(adminSelectedSingleDate, "yyyy-MM-dd");
      const override = availabilityData.dateOverrides.find(
        (o) => format(startOfDay(new Date(o.date)), "yyyy-MM-dd") === dateStr
      );
      const totalCapacity =
        override?.workMinutes ?? availabilityData.defaultWorkMinutes;
      const alreadyBooked =
        totalCapacity - (availabilityData.availableMinutesPerDay[dateStr] ?? 0);
      const initialAvailable = Math.max(0, totalCapacity - alreadyBooked);

      if (orderTotalMinutes > initialAvailable) {
        const confirmed = await showConfirmation({
          title: "Capacity Warning",
          body: `This order (${orderTotalMinutes} min) exceeds capacity (${initialAvailable} min) for ${dateStr}. Assign anyway?`,
          confirmText: "Assign Anyway",
          variant: "danger",
        });
        if (!confirmed) {
          return;
        }
      }

      const allUnitIds = order.items.flatMap((item, itemIndex) =>
        Array(item.quantity)
          .fill(null)
          .map((_, unitIndex) => `${item.id}-${unitIndex}`)
      );
      const newDeliveryDates = [
        { date: adminSelectedSingleDate, itemIds: allUnitIds },
      ];

      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryDates: newDeliveryDates }),
      });
      if (!res.ok) throw new Error("Failed to update delivery dates");

      showAlert("Delivery date(s) updated successfully!", "success");
      setIsEditingDates(false);
      setEditMode(null);
      fetchOrderAndDiameters();
    } catch (err) {
      console.error("Error updating dates:", err);
      showAlert(
        err instanceof Error ? err.message : "An unknown error occurred",
        "error"
      );
    } finally {
      setIsConfirmingDate(false);
    }
  };

  // Handle Split Date Save
  const handleSaveSplitDates = async () => {
    if (adminUnallocatedItems.length > 0) {
      showAlert("Please allocate all items before saving.", "warning");
      return;
    }
    let capacityWarning = false;
    if (availabilityData) {
      for (const entry of editedDeliveryDates) {
        const dateStr = format(entry.date, "yyyy-MM-dd");
        const itemsOnDate = entry.itemIds;
        const timeOnDate = itemsOnDate.reduce((sum, unitId) => {
          const originalItemId = extractOriginalItemId(unitId);
          const itemDetails = order?.items.find((i) => i.id === originalItemId);
          return (
            sum +
            (itemDetails?.categoryId
              ? availabilityData.manufacturingTimes[
                  itemDetails.categoryId.toString()
                ] || 0
              : 0)
          );
        }, 0);
        const override = availabilityData.dateOverrides.find(
          (o: any) =>
            format(startOfDay(new Date(o.date)), "yyyy-MM-dd") === dateStr
        );
        const totalCapacity =
          override?.workMinutes ?? availabilityData.defaultWorkMinutes;
        const alreadyBooked =
          totalCapacity -
          (availabilityData.availableMinutesPerDay[dateStr] ?? 0);
        const initialAvailable = Math.max(0, totalCapacity - alreadyBooked);
        if (timeOnDate > initialAvailable) {
          console.warn(
            `Date ${dateStr} exceeds capacity (${timeOnDate} min allocated vs ${initialAvailable} min available).`
          );
          capacityWarning = true;
        }
      }
    }
    if (capacityWarning) {
      const confirmed = await showConfirmation({
        title: "Capacity Warning",
        body: `One or more dates exceed. Assign anyway?`,
        confirmText: "Assign Anyway",
        variant: "danger",
      });
      if (!confirmed) {
        return;
      }
    }

    setIsConfirmingDate(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryDates: editedDeliveryDates }),
      });
      if (!res.ok) throw new Error("Failed to update delivery dates");

      showAlert("Delivery dates updated successfully!", "success");
      setIsEditingDates(false);
      setEditMode(null);
      fetchOrderAndDiameters();
    } catch (err) {
      console.error("Error updating dates:", err);
      showAlert(
        err instanceof Error ? err.message : "An unknown error occurred",
        "error"
      );
    } finally {
      setIsConfirmingDate(false);
    }
  };


  const handleAdminDateSelect = (date: Date | undefined) => {
    if (!availabilityData) return;
    console.log(
      `handleAdminDateSelect called. editMode: ${editMode}, requiresConfirmation: ${requiresConfirmation}`
    );

    if (requiresConfirmation) {
      console.log(
        `Admin (Pending Confirmation) selected date: ${
          date ? format(date, "yyyy-MM-dd") : "null"
        }`
      );
      setAdminSelectedSingleDate(date || null);
      return;
    }

    if (editMode === "single") {
      console.log(
        `Admin (Edit Single) selected date: ${
          date ? format(date, "yyyy-MM-dd") : "null"
        }`
      );
      setAdminSelectedSingleDate(date || null);
    } else if (editMode === "split") {
      console.log(
        `Admin (Edit Split) setting popup date: ${
          date ? format(date, "yyyy-MM-dd") : "null"
        }`
      );
      setAdminPopupDate(date || null);
      setAdminSelectedSingleDate(date || null);
    } else {
      console.warn("handleDateSelect called in an unexpected state.");
    }
  };

  // Handle Item Allocation (for split mode)
  const handleAdminAllocateItem = (itemToAllocate: CartItem) => {
    if (!adminPopupDate || !availabilityData || !order) {
      showAlert("No date selected for allocation.", "warning");
      return;
    }

    const targetDate = adminPopupDate;
    const itemTime =
      itemToAllocate.categoryId ? (availabilityData.manufacturingTimes[
        itemToAllocate.categoryId.toString()
      ] || 0) : 0;
    const dateString = format(targetDate, "yyyy-MM-dd");

    setEditedDeliveryDates((prev) => {
      const dateExists = prev.some((d) => isSameDay(d.date, targetDate));
      if (dateExists) {
        return prev.map((d) =>
          isSameDay(d.date, targetDate)
            ? { ...d, itemIds: [...d.itemIds, itemToAllocate.id] }
            : d
        );
      } else {
        return [...prev, { date: targetDate, itemIds: [itemToAllocate.id] }];
      }
    });

    setAdminUnallocatedItems((prev) =>
      prev.filter((item) => item.id !== itemToAllocate.id)
    );
  };

  // Handle Item Un-Allocation (for split mode)
  const handleAdminUnallocateItem = (
    unitIdToRemove: string,
    dateToRemoveFrom: Date
  ) => {
    console.log(`Admin Unallocating item ${unitIdToRemove}`);
    setEditedDeliveryDates((prev) =>
      prev
        .map((entry) => {
          if (isSameDay(entry.date, dateToRemoveFrom)) {
            const newItemIds = entry.itemIds.filter(
              (id) => id !== unitIdToRemove
            );
            return { ...entry, itemIds: newItemIds };
          }
          return entry;
        })
        .filter((entry) => entry.itemIds.length > 0)
    );

    const originalItemId = unitIdToRemove.split("-").slice(0, -1).join("-");
    const originalItem = order?.items.find((i) => i.id === originalItemId);

    if (originalItem) {
      const itemToAddBack: CartItem = {
        ...originalItem,
        id: unitIdToRemove,
        quantity: 1,
        productId: originalItem.productId?.toString(),
        categoryId: originalItem.categoryId?.toString(),
        diameterId: originalItem.diameterId?.toString(),
      };
      setAdminUnallocatedItems((prev) =>
        prev.find((i) => i.id === itemToAddBack.id)
          ? prev
          : [...prev, itemToAddBack]
      );
    } else {
      console.error(
        "Could not find original item details to unallocate:",
        unitIdToRemove
      );
    }
  };

  // Handler for Pending Confirmation
  const handleConfirmDates = async () => {
    if (!adminSelectedSingleDate || !order || !availabilityData) return;
    setIsConfirmingDate(true);
    setError(null);
    try {
      const orderTotalMinutes = order.items.reduce(
        (sum, item) =>
          sum +
          (item.categoryId ? (availabilityData.manufacturingTimes[item.categoryId.toString()] || 0) : 0) *
            item.quantity,
        0
      );
      const dateStr = format(adminSelectedSingleDate, "yyyy-MM-dd");
      const override = availabilityData.dateOverrides.find(
        (o) => format(startOfDay(new Date(o.date)), "yyyy-MM-dd") === dateStr
      );
      const totalCapacity =
        override?.workMinutes ?? availabilityData.defaultWorkMinutes;
      const alreadyBooked =
        totalCapacity - (availabilityData.availableMinutesPerDay[dateStr] ?? 0);
      const initialAvailable = totalCapacity - alreadyBooked;

      if (orderTotalMinutes > initialAvailable) {
        const confirmed = await showConfirmation({
          title: "Capacity Warning",
          body: `This order (${orderTotalMinutes} min) exceeds capacity (${initialAvailable} min) for ${dateStr}. Assign anyway?`,
          confirmText: "Assign Anyway",
          variant: "danger",
        });
        if (!confirmed) {
          return;
        }
      }

      const allUnitIds = order.items.flatMap((item, itemIndex) =>
        Array(item.quantity)
          .fill(null)
          .map((_, unitIndex) => `${item.id}-${unitIndex}`)
      );
      const newDeliveryDates = [
        { date: adminSelectedSingleDate, itemIds: allUnitIds },
      ];

      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: OrderStatus.NEW,
          deliveryDates: newDeliveryDates,
        }),
      });
      if (!res.ok) throw new Error("Failed to confirm date and update order");

      showAlert("Order confirmed and date assigned!", "success");
      fetchOrderAndDiameters();
    } catch (err) {
      console.error("Error confirming dates:", err);
      showAlert(
        err instanceof Error ? err.message : "An unknown error occurred",
        "error"
      );
    } finally {
      setIsConfirmingDate(false);
    }
  };

  // --- Render Logic ---
  if (isLoading && !order) return <LoadingSpinner />;
  if (error && !order)
    return <p className="text-red-500">Error loading order: {error}</p>;
  if (!order) return <p>Order not found.</p>;

  const requiresConfirmation =
    order.status === OrderStatus.PENDING_CONFIRMATION;

  return (
    <section>
      <Link
        href="/bakery-manufacturing-orders/orders"
        className="font-body text-accent hover:underline mb-lg inline-block"
      >
        &larr; Back to all orders
      </Link>
      <h1 className="font-heading text-h1 text-primary mb-lg flex items-center gap-md">
        {" "}
        <span>Order #{order._id.toString().slice(-6).toUpperCase()}</span>
        {requiresConfirmation && (
          <span className="font-body text-small font-semibold bg-accent/10 text-accent px-md py-xs rounded-full">
            {" "}
            Pending Confirmation
          </span>
        )}
      </h1>

      {isLoading &&
        !isConfirmingDate && (
          <div className="flex justify-center my-md">
            <LoadingSpinner />
          </div>
        )}
      {error && (
        <p className="mb-md text-center p-md bg-error/10 text-error rounded-medium">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        {" "}
        {/* --- Left Column --- */}
        <div className="md:col-span-2 space-y-lg">
          <OrderDetailItems
            items={order.items}
            diameters={diameters}
            totalAmount={order.totalAmount}
            onUpdate={fetchOrderAndDiameters}
            referenceImages={order.referenceImages}
          />

          {/* --- Assigned Delivery Dates (Shown for non-pending orders) --- */}
          {!requiresConfirmation &&
            order.deliveryInfo.deliveryDates &&
            order.deliveryInfo.deliveryDates.length > 0 && (
              <OrderDetailAssignedDates order={order} />
            )}
        </div>{" "}
        {/* --- Right Column --- */}
        <div className="space-y-lg">
          <OrderDetailCustomer
            customerInfo={order.customerInfo}
            deliveryInfo={order.deliveryInfo}
          />

          <OrderDetailActions
            order={order}
            newStatus={newStatus}
            setNewStatus={setNewStatus}
            handleStatusUpdate={handleStatusUpdate}
            requiresConfirmation={requiresConfirmation}
            availabilityData={availabilityData}
            capacityPercentages={capacityPercentages}
            adminSelectedSingleDate={adminSelectedSingleDate}
            handleAdminDateSelect={handleAdminDateSelect}
            handleConfirmDates={handleConfirmDates}
            isConfirmingDate={isConfirmingDate}
            isLoading={isLoading}
            minutesBooked={minutesBooked}
            settings={settings}
            isEditingDates={isEditingDates}
            editMode={editMode}
            adminPopupDate={adminPopupDate}
            editedDeliveryDates={editedDeliveryDates}
            adminUnallocatedItems={adminUnallocatedItems}
            handleToggleEditDates={handleToggleEditDates}
            handleSetEditModeSingle={handleSetEditModeSingle}
            handleSetEditModeSplit={handleSetEditModeSplit}
            handleBackToModeSelection={handleBackToModeSelection}
            handleSaveSingleDate={handleSaveSingleDate}
            handleSaveSplitDates={handleSaveSplitDates}
            handleAdminAllocateItem={handleAdminAllocateItem}
            handleAdminUnallocateItem={handleAdminUnallocateItem}
            setAdminPopupDate={setAdminPopupDate}
          />
        </div>
      </div>
      {/* Internal Notes Section */}
      <div className="mt-8">
        <OrderNotesSection order={order} onUpdate={fetchOrderAndDiameters} />
      </div>
    </section>
  );
};

export default OrderDetailsPage;
