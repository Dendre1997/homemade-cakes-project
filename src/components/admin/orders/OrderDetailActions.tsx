"use client";

import { Order, OrderStatus, CartItem, ScheduleSettings } from "@/types";
import { format } from "date-fns";
import { formatOrderDeliveryDateLabel } from "@/lib/admin/orderDetailDisplay";
import { OrderAssignmentMonthCalendar } from "@/components/admin/orders/OrderAssignmentMonthCalendar";
import LoadingSpinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { extractOriginalItemId } from "../../../lib/utils";
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
  setAdminPopupDate: (date: Date | null) => void
  onSourceUpdate: (source: string) => void;
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
  onSourceUpdate,
}: OrderDetailActionsProps) => {
  const getItemDetails = (unitId: string) => {
    const originalItemId = extractOriginalItemId(unitId);
    return order.items.find((i) => i.id === originalItemId);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-background/20 p-4 shadow-sm backdrop-blur-xl backdrop-saturate-150 sm:p-5">
      {requiresConfirmation ? (
        <>
          <h2 className="font-heading text-lg font-semibold text-primary">
            Assign date
          </h2>
          <p className="text-sm text-primary/70">
            Select a date below based on availability. The order will be
            assigned to status `New` upon confirmation.
          </p>
          {availabilityData ? (
            <OrderAssignmentMonthCalendar
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
                {formatOrderDeliveryDateLabel(adminSelectedSingleDate)}
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
          <h2 className="font-heading text-lg font-semibold text-primary">
            Workflow
          </h2>
          {/* ── Order Source ───────────────────────────────────── */}
          <div>
            <label className="block font-body text-small text-primary/80 mb-sm">
              Order Source
            </label>
            <Select
              value={order.source ?? ""}
              onValueChange={(value) => onSourceUpdate(value)}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web">Website</SelectItem>
                <SelectItem value="instagram">Instagram Direct</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                    <OrderAssignmentMonthCalendar
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
                        {formatOrderDeliveryDateLabel(adminSelectedSingleDate)}
                      </span>
                    </p>
                  )}
                  <div className="flex-col">
                    <Button
                      onClick={handleSaveSingleDate}
                      className="w-full mb-1"
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
                        variant="secondary"
                        className="w-full"
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
                    <OrderAssignmentMonthCalendar
                      capacityPercentages={capacityPercentages}
                      adminBlockedDates={[]}
                      leadTimeDays={0}
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
                                {formatOrderDeliveryDateLabel(entry.date)}
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
              <p className="hidden text-sm text-primary/80 lg:block">
                Current status:{" "}
                <span className="font-semibold capitalize text-primary">
                  {order.status.replace(/_/g, " ")}
                </span>
              </p>
              <div className="hidden space-y-3 lg:block">
                <div>
                  <label
                    htmlFor="status-select"
                    className="mb-1.5 block text-sm text-primary/70"
                  >
                    Change status
                  </label>
                  <Select
                    value={newStatus}
                    onValueChange={(value) =>
                      setNewStatus(value as OrderStatus)
                    }
                  >
                    <SelectTrigger id="status-select">
                      <SelectValue placeholder="Select new status…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(OrderStatus)
                        .filter(
                          (status) =>
                            status !== OrderStatus.PENDING_CONFIRMATION
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
                  disabled={
                    isLoading || newStatus === order.status || !newStatus
                  }
                >
                  {isLoading ? "Updating…" : "Update status"}
                </Button>
              </div>
              <p className="text-sm text-primary/65 lg:hidden">
                Use the bar below to change status on mobile.
              </p>
              {order.deliveryInfo.deliveryDates &&
                order.deliveryInfo.deliveryDates.length > 0 && (
                  <Button
                    onClick={handleToggleEditDates}
                    className="w-full"
                    variant="secondary"
                    disabled={isLoading || isConfirmingDate}
                  >
                    Edit assigned date(s)
                  </Button>
                )}
            </>
          )}
        </>
      )}
    </div>
  );
};
