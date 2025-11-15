"use client";

import { Order, OrderStatus, CartItem, ScheduleSettings } from "@/types";
import { format, isSameDay, startOfDay } from "date-fns";
import { OrderAssignmentDatePicker } from "@/components/admin/OrderAssignmentDatePicker";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { extractOriginalItemId } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/Select";

interface OrderDetailActionsProps {
  order: Order;
  newStatus: OrderStatus | "";
  setNewStatus: (status: OrderStatus) => void;
  handleStatusUpdate: () => void;

  // For Confirmation
  requiresConfirmation: boolean;
  availabilityData: any;
  capacityPercentages: Record<string, number>;
  adminSelectedSingleDate: Date | undefined | null;
  handleAdminDateSelect: (date: Date | undefined) => void;
  handleConfirmDates: () => void;
  isConfirmingDate: boolean;
  isLoading: boolean;
  minutesBooked: { _id: string; totalMinutes: number }[];
  settings: Partial<ScheduleSettings> | null;

  // For Editing dates
  isEditingDates: boolean;
  editMode: "single" | "split" | null;
  adminPopupDate: Date | null;
  editedDeliveryDates: { date: Date; itemIds: string[] }[];
  adminUnallocatedItems: CartItem[];

  handleToggleEditDates: () => void;
  handleSetEditModeSingle: () => void;
  handleSetEditModeSplit: () => void;
  handleBackToModeSelection: () => void;
  handleSaveSingleDate: () => void;
  handleSaveSplitDates: () => void;
  handleAdminAllocateItem: (item: CartItem) => void;
  handleAdminUnallocateItem: (unitId: string, date: Date) => void;
  setAdminPopupDate: (date: Date | null) => void;
}

export const OrderDetailActions = ({
  order,
  newStatus,
  setNewStatus,
  handleStatusUpdate,
  requiresConfirmation,
  availabilityData,
  capacityPercentages,
  adminSelectedSingleDate,
  handleAdminDateSelect,
  handleConfirmDates,
  isConfirmingDate,
  isLoading,
  minutesBooked,
  settings,
  isEditingDates,
  editMode,
  adminPopupDate,
  editedDeliveryDates,
  adminUnallocatedItems,
  handleToggleEditDates,
  handleSetEditModeSingle,
  handleSetEditModeSplit,
  handleBackToModeSelection,
  handleSaveSingleDate,
  handleSaveSplitDates,
  handleAdminAllocateItem,
  handleAdminUnallocateItem,
  setAdminPopupDate,
}: OrderDetailActionsProps) => {
  const getItemDetails = (unitId: string) => {
    const originalItemId = extractOriginalItemId(unitId);
    return order.items.find((i) => i.id === originalItemId);
  };

  return (
    <div className="bg-card-background p-lg rounded-large shadow-md space-y-md">
      {requiresConfirmation ? (
        <>
          <h2 className="font-heading text-h3 text-primary mb-sm">
            Assign Date
          </h2>
          <p className="font-body text-small text-primary/80 mb-md">
            Select a date below based on availability. The order will be
            assigned to status `New` upon confirmation.
          </p>
          {availabilityData ? (
            <OrderAssignmentDatePicker
              capacityPercentages={capacityPercentages}
              adminBlockedDates={availabilityData.adminBlockedDates}
              leadTimeDays={availabilityData.leadTimeDays}
              selected={adminSelectedSingleDate}
              onSelect={handleAdminDateSelect}
            />
          ) : (
            <div className="flex justify-center p-lg">
              <LoadingSpinner />
            </div>
          )}
          {adminSelectedSingleDate && (
            <p className="text-center font-body text-primary text-sm">
              Target date selected:{" "}
              <span className="font-semibold">
                {format(adminSelectedSingleDate, "EEEE, MMM d")}
              </span>
            </p>
          )}
          <Button
            onClick={handleConfirmDates}
            className="w-full"
            variant="primary"
            disabled={!adminSelectedSingleDate || isConfirmingDate || isLoading}
          >
            {isConfirmingDate ? <LoadingSpinner /> : "Confirm & Assign Date"}
          </Button>
          <Button
            onClick={() => setNewStatus(OrderStatus.CANCELLED)}
            className="w-full"
            variant="text"
            disabled={isConfirmingDate || isLoading}
          >
            Cancel Order Instead
          </Button>
          {newStatus === OrderStatus.CANCELLED && (
            <Button
              onClick={handleStatusUpdate}
              className="w-full"
              variant="danger"
              disabled={isLoading}
            >
              Confirm Cancellation
            </Button>
          )}
        </>
      ) : (
        <>
          <h2 className="font-heading text-h3 text-primary mb-md">
            Order Status & Actions
          </h2>

          {isEditingDates ? (
            <>
              {editMode === null && (
                <div className="space-y-md border-t border-border pt-md mt-md">
                  <h3 className="font-body font-bold text-primary text-center">
                    Choose Edit Mode
                  </h3>
                  <div className="flex flex-col gap-md">
                    <Button
                      onClick={handleSetEditModeSingle}
                      className="flex-1"
                      variant="secondary"
                    >
                      Assign All to One Date
                    </Button>
                    <Button
                      onClick={handleSetEditModeSplit}
                      className="flex-1"
                      variant="secondary"
                    >
                      Split Across Dates
                    </Button>
                  </div>
                  <Button
                    onClick={handleToggleEditDates}
                    className="w-full"
                    variant="text"
                  >
                    Cancel Edit
                  </Button>
                </div>
              )}

              {editMode === "single" && (
                <div className="space-y-md border-t border-border pt-md mt-md">
                  <div className="flex justify-between items-center">
                    <h3 className="font-body font-bold text-primary">
                      Select New Single Date
                    </h3>
                    <Button
                      onClick={handleBackToModeSelection}
                      variant="text"
                      size="sm"
                    >
                      &larr; Back
                    </Button>
                  </div>
                  {availabilityData ? (
                    <OrderAssignmentDatePicker
                      capacityPercentages={capacityPercentages}
                      adminBlockedDates={availabilityData.adminBlockedDates}
                      leadTimeDays={availabilityData.leadTimeDays}
                      selected={adminSelectedSingleDate}
                      onSelect={handleAdminDateSelect}
                    />
                  ) : (
                    <div className="flex justify-center p-lg">saving...</div>
                  )}
                  {adminSelectedSingleDate && (
                    <p className="text-center font-body text-primary text-sm">
                      New Selected Date:{" "}
                      <span className="font-semibold">
                        {format(adminSelectedSingleDate, "EEEE, MMM d, yyyy")}
                      </span>
                    </p>
                  )}
                  <div className="flex gap-md">
                    <Button
                      onClick={handleSaveSingleDate}
                      className="flex-1"
                      variant="primary"
                      disabled={
                        !adminSelectedSingleDate ||
                        isConfirmingDate ||
                        isLoading
                      }
                    >
                      {isConfirmingDate ? "Saving..." : "Save New Date"}
                    </Button>
                    <Button
                      onClick={handleToggleEditDates}
                      className="flex-1"
                      variant="secondary"
                      disabled={isConfirmingDate || isLoading}
                    >
                      Cancel Edit
                    </Button>
                  </div>
                </div>
              )}

              {editMode === "split" && (
                <div className="space-y-md border-t border-border pt-md mt-md">
                  <div className="flex justify-between items-center">
                    <h3 className="font-body font-bold text-primary">
                      Assign Items to Dates
                    </h3>
                    <Button
                      onClick={handleBackToModeSelection}
                      variant="text"
                      size="sm"
                    >
                      &larr; Back
                    </Button>
                  </div>
                  {availabilityData ? (
                    <OrderAssignmentDatePicker
                      capacityPercentages={capacityPercentages}
                      adminBlockedDates={availabilityData.adminBlockedDates}
                      leadTimeDays={availabilityData.leadTimeDays}
                      selected={adminPopupDate}
                      onSelect={handleAdminDateSelect}
                      isSplitRequired={true}
                      popupDate={adminPopupDate}
                      setPopupDate={setAdminPopupDate}
                      unallocatedItems={adminUnallocatedItems}
                      onAllocateItem={handleAdminAllocateItem}
                    />
                  ) : (
                    <div className="flex justify-center p-lg">Saving...</div>
                  )}

                  <div className="my-lg">
                    <h4 className="font-body font-bold text-primary mb-md">
                      Currently Allocated (Editing)
                    </h4>
                    {editedDeliveryDates.length > 0 ? (
                      <div className="space-y-md max-h-60 overflow-y-auto pr-sm border border-border p-sm rounded-medium">
                        {editedDeliveryDates
                          .sort((a, b) => a.date.getTime() - b.date.getTime())
                          .map((entry) => (
                            <div key={format(entry.date, "yyyy-MM-dd")}>
                              <p className="font-body font-semibold text-primary mb-xs">
                                {format(entry.date, "EEEE, MMM d")}
                              </p>
                              <div className="space-y-sm pl-md border-l-2 border-border ml-sm">
                                {entry.itemIds.map((unitId) => {
                                  const itemDetails = getItemDetails(unitId);
                                  return (
                                    <div
                                      key={unitId}
                                      className="flex items-center justify-between p-xs bg-background rounded-small"
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
                                        variant="danger"
                                        onClick={() =>
                                          handleAdminUnallocateItem(
                                            unitId,
                                            entry.date
                                          )
                                        }
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="font-body text-small text-primary/60 p-sm">
                        No items allocated yet in this edit session.
                      </p>
                    )}

                    {adminUnallocatedItems.length > 0 && (
                      <p className="mt-md font-body text-small text-primary/80">
                        {adminUnallocatedItems.length} item(s) unallocated.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-md">
                    <Button
                      onClick={handleSaveSplitDates}
                      className="flex-1"
                      variant="primary"
                      disabled={
                        adminUnallocatedItems.length > 0 ||
                        isConfirmingDate ||
                        isLoading
                      }
                    >
                      {isConfirmingDate ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      onClick={handleToggleEditDates}
                      className="flex-1"
                      variant="secondary"
                      disabled={isConfirmingDate || isLoading}
                    >
                      Cancel Edit
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="font-body">
                Current status:{" "}
                <span className="font-bold capitalize">
                  {order.status.replace(/_/g, " ")}
                </span>
              </p>
              <div>
                <label
                  htmlFor="status-select"
                  className="block font-body text-small text-primary/80 mb-sm"
                >
                  Change status
                </label>
                <Select
                  value={newStatus}
                  onValueChange={(value) => setNewStatus(value as OrderStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(OrderStatus)
                      .filter(
                        (status) => status !== OrderStatus.PENDING_CONFIRMATION
                      )
                      .map((status) => (
                        <SelectItem key={status} value={status}>
                          {status
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStatusUpdate}
                className="w-full"
                disabled={isLoading || newStatus === order.status || !newStatus}
              >
                {isLoading ? <p>Updating...</p> : "Update Status"}
              </Button>
              {order.deliveryInfo.deliveryDates &&
                order.deliveryInfo.deliveryDates.length > 0 && (
                  <Button
                    onClick={handleToggleEditDates}
                    className="w-full"
                    variant="secondary"
                    disabled={isLoading || isConfirmingDate}
                  >
                    Edit Assigned Date(s)
                  </Button>
                )}
            </>
          )}
        </>
      )}
    </div>
  );
};
