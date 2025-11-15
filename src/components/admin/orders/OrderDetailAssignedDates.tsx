"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Order, ScheduleSettings } from "@/types"; // 'ScheduleSettings' не використовується, можна видалити
import { format, isSameDay } from "date-fns";
import { extractOriginalItemId } from "@/lib/utils";
import { useAlert } from "@/contexts/AlertContext";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, Clock } from "lucide-react";
import LoadingSpinner from "@/components/ui/Spinner";
import { TimeSlotManager } from "@/components/ui/TimeSlotManager";

interface OrderDetailAssignedDatesProps {
  order: Order;
}

const OrderDetailAssignedDates = ({ order }: OrderDetailAssignedDatesProps) => {
  const router = useRouter();
  const { showAlert } = useAlert();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<
    Order["deliveryInfo"]["deliveryDates"][0] | null
  >(null);

  const [newTimeSlots, setNewTimeSlots] = useState<string[]>([]);
  const [currentDates, setCurrentDates] = useState(
    order.deliveryInfo.deliveryDates
  );

  useEffect(() => {
    setCurrentDates(order.deliveryInfo.deliveryDates);
  }, [order.deliveryInfo.deliveryDates]);

  if (!currentDates || currentDates.length === 0) {
    return null;
  }

  const handleOpenModal = (
    entry: Order["deliveryInfo"]["deliveryDates"][0]
  ) => {
    setEditingEntry(entry);
    setNewTimeSlots([entry.timeSlot]);
    setIsModalOpen(true);
  };

  const handleSaveTimeSlot = async () => {
    const singleTimeSlot = newTimeSlots[0]?.trim();

    if (!editingEntry || !singleTimeSlot) {
      showAlert("Time slot cannot be empty.", "error");
      return;
    }

    setIsSaving(true);

    const newDeliveryDates = currentDates.map((entry) => {
      if (
        isSameDay(new Date(entry.date), new Date(editingEntry.date)) &&
        entry.timeSlot === editingEntry.timeSlot
      ) {
        return { ...entry, timeSlot: singleTimeSlot };
      }
      return entry;
    });

    try {
      const res = await fetch(`/api/admin/orders/${order._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryDates: newDeliveryDates }),
      });

      if (!res.ok) throw new Error("Failed to update time slot");

      showAlert("Time slot updated successfully!", "success");
      setIsModalOpen(false);

      setCurrentDates(newDeliveryDates);

      router.refresh();
    } catch (err) {
      console.error(err);
      showAlert(
        err instanceof Error ? err.message : "An unknown error occurred",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
      <div className="bg-card-background p-lg rounded-large shadow-md">
        <h2 className="font-heading text-h3 text-primary mb-md">
          Assigned Dates
        </h2>
        <div className="space-y-md">
          {currentDates
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map((entry) => (
              <div key={new Date(entry.date).toISOString() + entry.timeSlot}>
                <div className="flex justify-between items-center mb-2 flex-col md:flex-row">
                  <p className="font-body font-bold text-primary">
                    {format(new Date(entry.date), "EEEE, MMM d, yyyy")}
                  </p>

                  <Button
                    type="button"
                    variant="text"
                    size="sm"
                    className="text-accent"
                    onClick={() => handleOpenModal(entry)}
                  >
                    <Clock className="h-4 w-4 mr-sm" />
                    {entry.timeSlot} (Change)
                  </Button>
                </div>

                <ul className="list-disc list-inside font-body text-small text-primary/80 pl-md">
                  {entry.itemIds.map((unitId) => {
                    const originalItemId = extractOriginalItemId(unitId);
                    const itemDetails = order.items.find(
                      (i) => i.id === originalItemId
                    );
                    return (
                      <li key={unitId}>
                        {itemDetails
                          ? `${itemDetails.name} (${itemDetails.flavor})`
                          : `Item ID: ${unitId}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card-background p-lg rounded-large shadow-lg w-full max-w-sm z-50">
          <Dialog.Title className="font-heading text-h3 text-primary">
            {`change ${order.deliveryInfo.method} time`}
          </Dialog.Title>
          <p className="font-body text-primary/80 text-small mb-md">
            Enter a new time slot for{" "}
            {editingEntry ? format(new Date(editingEntry.date), "MMM d") : ""}.
          </p>
          <TimeSlotManager
            value={newTimeSlots}
            onChange={(newSlots: string[]) => {
              if (newSlots.length > newTimeSlots.length) {
                const newTag = newSlots.find(
                  (slot) => !newTimeSlots.includes(slot)
                );

                if (newTag) {
                  setNewTimeSlots([newTag]);
                } else {
                  setNewTimeSlots([newSlots[newSlots.length - 1]]);
                }
              } else {
                setNewTimeSlots(newSlots);
              }
            }}
          />

          <div className="mt-lg flex justify-end gap-md">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveTimeSlot}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Slot"}
            </Button>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-md right-md p-1 rounded-full transition-colors text-primary/60 hover:bg-subtleBackground">
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default OrderDetailAssignedDates;
