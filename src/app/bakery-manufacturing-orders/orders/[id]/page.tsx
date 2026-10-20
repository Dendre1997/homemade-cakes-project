"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Order, Diameter, OrderStatus, ScheduleSettings, IShape } from "@/types"; // Import OrderStatus
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
import { ReceiptGeneratorModal } from "@/components/admin/orders/ReceiptGeneratorModal";
import { OrderDetailShell } from "@/components/admin/orders/OrderDetailShell";
import { OrderDetailHeader } from "@/components/admin/orders/OrderDetailHeader";
import { OrderDetailMobileBar } from "@/components/admin/orders/OrderDetailMobileBar";
import {
  OrderToolsDrawer,
  OrderToolsTriggerButton,
} from "@/components/admin/orders/OrderToolsDrawer";
import { DashboardGlassCard } from "@/components/admin/dashboard/DashboardGlassCard";
import { Flavor } from "@/types";
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
  const [shapes, setShapes] = useState<IShape[]>([]);
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

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [flavorMap, setFlavorMap] = useState<Record<string, string>>({});
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  // --- Data Fetching ---
  const fetchOrderAndDiameters = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [orderRes, diametersRes, shapesRes] = await Promise.all([
        fetch(`/api/admin/orders/${id}`),
        fetch("/api/admin/diameters"),
        fetch("/api/admin/shapes"),
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
      if (shapesRes.ok) setShapes(await shapesRes.json());

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
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch availability data");
        const data: AvailabilityData = await res.json();
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
    setCapacityPercentages(percentages);
  }, [availabilityData]);

  useEffect(() => {
    fetch("/api/admin/flavors")
      .then(res => res.json())
      .then((flavors: Flavor[]) => {
        const map: Record<string, string> = {};
        flavors.forEach(f => map[f._id] = f.name);
        setFlavorMap(map);
      })
      .catch(err => console.warn(err));
  }, []);

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

  const handleSourceUpdate = async (source: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (!res.ok) throw new Error("Failed to update source");
      showAlert("Order source updated!", "success");
      fetchOrderAndDiameters();
    } catch (error) {
      console.error(error);
      showAlert("Error updating source", "error");
    }
  };

  const handleMarkAsPaid = async () => {
    if (!order) return;
    const confirmed = await showConfirmation({
      title: "Mark as Paid",
      body: `Confirm that payment has been received for Order #${order._id.toString().slice(-6).toUpperCase()} ($${order.totalAmount.toFixed(2)})?`,
      confirmText: "Yes, Mark as Paid",
      variant: "primary",
    });
    if (!confirmed) return;

    setIsMarkingPaid(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPaid: true,
          // Atomically advance status — no need to touch the dropdown separately
          status: OrderStatus.CONFIRMED,
          paymentDetails: {
            method: 'manual',
            paidAt: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to update payment status");
      showAlert("Order marked as paid! ", "success");
      fetchOrderAndDiameters();
    } catch (error) {
      console.error(error);
      showAlert("Error updating payment status", "error");
    } finally {
      setIsMarkingPaid(false);
    }
  };


  const copyLinkToClipboard = async (token: string) => {
    const link = `${window.location.origin}/pay/${order!._id}?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      showAlert("Payment link copied to clipboard!", "success");
    } catch (err) {
      console.error("Clipboard write failed:", err);
      showAlert("Failed to copy the payment link to clipboard.", "error");
    }
  };

  const handleCopyPaymentLink = async () => {
    if (!order) return;

    // Fast path: token already exists — copy immediately.
    if (order.paymentToken) {
      await copyLinkToClipboard(order.paymentToken);
      return;
    }

    // Lazy generation: legacy order without a token — mint one on demand.
    setIsGeneratingToken(true);
    try {
      const res = await fetch(
        `/api/admin/orders/${order._id}/generate-payment-token`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.paymentToken) {
        throw new Error(data.error || "Failed to generate payment token");
      }

      // Cache the token locally so subsequent clicks skip the API call.
      setOrder((prev) => (prev ? { ...prev, paymentToken: data.paymentToken } : prev));
      await copyLinkToClipboard(data.paymentToken);
    } catch (err) {
      console.error("Failed to generate payment token:", err);
      showAlert(
        err instanceof Error ? err.message : "Failed to generate payment link.",
        "error"
      );
    } finally {
      setIsGeneratingToken(false);
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
        `Admin (Pending Confirmation) selected date: ${date ? format(date, "yyyy-MM-dd") : "null"
        }`
      );
      setAdminSelectedSingleDate(date || null);
      return;
    }

    if (editMode === "single") {
      console.log(
        `Admin (Edit Single) selected date: ${date ? format(date, "yyyy-MM-dd") : "null"
        }`
      );
      setAdminSelectedSingleDate(date || null);
    } else if (editMode === "split") {
      console.log(
        `Admin (Edit Split) setting popup date: ${date ? format(date, "yyyy-MM-dd") : "null"
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
    <>
      {isLoading && !isConfirmingDate && (
        <div className="mb-4 flex justify-center">
          <LoadingSpinner />
        </div>
      )}
      {error && (
        <p className="mb-4 rounded-xl border border-error/20 bg-error/10 p-3 text-center text-sm text-error">
          {error}
        </p>
      )}

      <OrderDetailShell
        header={
          <OrderDetailHeader
            order={order}
            toolsTrigger={
              <OrderToolsTriggerButton onClick={() => setIsToolsOpen(true)} />
            }
          />
        }
        main={
          <>
            <DashboardGlassCard>
              <OrderDetailItems
                items={order.items}
                diameters={diameters}
                shapes={shapes}
                totalAmount={order.totalAmount}
                onUpdate={fetchOrderAndDiameters}
                referenceImages={order.referenceImages}
                flavorMap={flavorMap}
              />
            </DashboardGlassCard>

            {!requiresConfirmation &&
              order.deliveryInfo.deliveryDates &&
              order.deliveryInfo.deliveryDates.length > 0 && (
                <OrderDetailAssignedDates order={order} />
              )}
          </>
        }
        aside={
          <>
            <OrderDetailCustomer
              customerInfo={order.customerInfo}
              deliveryInfo={order.deliveryInfo}
              orderId={order._id.toString()}
              onUpdate={fetchOrderAndDiameters}
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
              onSourceUpdate={handleSourceUpdate}
            />
          </>
        }
        notes={
          <DashboardGlassCard className="p-0 sm:p-0">
            <div className="p-4 sm:p-5">
              <OrderNotesSection order={order} onUpdate={fetchOrderAndDiameters} />
            </div>
          </DashboardGlassCard>
        }
        mobileBar={
          <OrderDetailMobileBar
            order={order}
            newStatus={newStatus}
            setNewStatus={setNewStatus}
            onStatusUpdate={handleStatusUpdate}
            isLoading={isLoading}
            isMarkingPaid={isMarkingPaid}
            onMarkAsPaid={handleMarkAsPaid}
            requiresConfirmation={requiresConfirmation}
          />
        }
      />

      <OrderToolsDrawer
        open={isToolsOpen}
        onOpenChange={setIsToolsOpen}
        orderId={order._id.toString()}
        isPaid={order.isPaid}
        isMarkingPaid={isMarkingPaid}
        isGeneratingToken={isGeneratingToken}
        onMarkAsPaid={handleMarkAsPaid}
        onCopyPaymentLink={handleCopyPaymentLink}
        onOpenReceipt={() => setIsReceiptModalOpen(true)}
      />

      <ReceiptGeneratorModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        order={order}
        diameters={diameters}
        shapes={shapes}
        flavorMap={flavorMap}
      />
    </>
  );
};

export default OrderDetailsPage;
