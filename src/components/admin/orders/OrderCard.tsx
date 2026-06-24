import { Order, OrderStatus, CartItem } from "@/types";
import { format, isToday, isTomorrow } from "date-fns";
import {
  Truck,
  Store,
  Instagram,
  Globe,
  ScrollText,
  Box,
  Cake,
  Layers,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Link from "next/link";
import { cn } from "../../../lib/utils";

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  diametersMap?: Record<string, number>;
  flavorMap?: Record<string, string>;
}

export const OrderCard = ({
  order,
  onStatusChange,
  diametersMap,
  flavorMap,
}: OrderCardProps) => {
  const isDelivery = order.deliveryInfo.method === "delivery";
  const primaryDateObj = order.deliveryInfo.deliveryDates?.[0] || {
    date: order.createdAt,
    timeSlot: "N/A",
  };
  const primaryDate = new Date(primaryDateObj.date);
  const isUrgent = isToday(primaryDate) || isTomorrow(primaryDate);

  const resolveFlavorName = (value?: string) => {
    if (!value?.trim()) return undefined;
    if (value.length === 24 && /^[0-9a-fA-F]+$/.test(value)) {
      return flavorMap?.[value] || value;
    }
    return value;
  };

  const resolveSizeDisplay = (item: CartItem) => {
    if (item.customSize?.trim()) return item.customSize.trim();

    const diameterId =
      item.diameterId?.toString() ||
      item.selectedConfig?.cake?.diameterId?.toString();

    if (diameterId && diametersMap?.[diameterId]) {
      return `${diametersMap[diameterId]}"`;
    }

    return undefined;
  };

  const resolveCakeFlavor = (item: CartItem) =>
    resolveFlavorName(item.customFlavor) ||
    resolveFlavorName(item.selectedConfig?.cake?.flavorId) ||
    resolveFlavorName(item.flavor) ||
    undefined;

  const isComboItem = (item: CartItem) =>
    item.isCombo === true ||
    item.productType === "combo" ||
    (!!item.selectedConfig?.cake &&
      (!!item.selectedConfig?.items || !!item.selectedConfig?.quantityConfigId)) ||
    String(item.flavor ?? "").includes("Combo:");

  const isSetItem = (item: CartItem) =>
    item.productType === "set" ||
    (!!item.selectedConfig?.items &&
      !item.selectedConfig?.cake &&
      item.selectedConfig.items.length > 0);

  const MetaRow = ({
    label,
    value,
  }: {
    label: string;
    value?: string | null;
  }) => {
    if (!value?.trim()) return null;
    return (
      <span className="text-primary/70 leading-snug">
        <span className="font-semibold text-[#764a4d]/90">{label}:</span>{" "}
        {value}
      </span>
    );
  };

  const renderItemDetails = (item: CartItem) => {
    if (isComboItem(item)) {
      const bentoFlavor =
        resolveFlavorName(item.selectedConfig?.cake?.flavorId) ||
        (item.flavor?.includes("For Bento")
          ? item.flavor.split("For Bento")[1]?.trim()
          : undefined) ||
        resolveCakeFlavor(item);
      const bentoSize = resolveSizeDisplay(item);

      return (
        <div className="flex flex-col gap-2 mt-1 w-full">
          <div className="pl-2 border-l-2 border-[#764a4d] bg-[#764a4d]/5 p-1.5 rounded-r text-xs">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Cake className="w-3 h-3 text-[#764a4d]" />
              <span className="font-bold text-[#231416] uppercase tracking-wide">
                Bento Cake
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <MetaRow label="Flavor" value={bentoFlavor} />
              <MetaRow label="Size" value={bentoSize} />
            </div>
            {item.selectedConfig?.cake?.inscription && (
              <div className="flex items-start gap-1 mt-1 text-[#764a4d]">
                <ScrollText className="w-3 h-3 shrink-0" />
                <span className="italic font-medium">
                  &ldquo;{item.selectedConfig.cake.inscription}&rdquo;
                </span>
              </div>
            )}
          </div>

          <div className="pl-2 border-l-2 border-gray-300 text-xs text-gray-600">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Box className="w-3 h-3" />
              <span className="font-bold text-[#231416]">Box Items</span>
            </div>
            <MetaRow
              label="Quantity"
              value={
                item.selectedConfig?.quantityConfigId || `${item.quantity} pc`
              }
            />
            {item.selectedConfig?.items && item.selectedConfig.items.length > 0 ? (
              <div className="mt-1 space-y-0.5 text-primary/60">
                {item.selectedConfig.items.map((boxItem, i) => (
                  <div key={i}>
                    {boxItem.count}x{" "}
                    {resolveFlavorName(boxItem.flavorId) || "Flavor"}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-primary/60 block mt-0.5">
                {item.flavor?.split("For Bento")[0]?.trim() || "Mix"}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (isSetItem(item)) {
      return (
        <div className="flex flex-col gap-1 mt-0.5 w-full text-xs">
          <div className="flex items-center gap-1.5 text-[#764a4d] font-medium">
            <Box className="w-3 h-3" />
            <span>Set</span>
          </div>
          <div className="flex flex-col gap-0.5 pl-4.5">
            <MetaRow
              label="Quantity"
              value={
                item.selectedConfig?.quantityConfigId || `${item.quantity} pc`
              }
            />
            {item.selectedConfig?.items?.map((boxItem, i) => (
              <span key={i} className="text-[#231416] text-primary/70">
                {boxItem.count}x{" "}
                {resolveFlavorName(boxItem.flavorId) || "Flavor"}
              </span>
            ))}
          </div>
        </div>
      );
    }

    const sizeDisplay = resolveSizeDisplay(item);
    const flavorDisplay = resolveCakeFlavor(item);

    return (
      <div className="flex flex-col gap-0.5 text-xs text-[#764a4d] mt-0.5">
        <div className="flex items-start gap-1">
          <Layers className="w-3 h-3 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <MetaRow label="Size" value={sizeDisplay} />
            <MetaRow label="Flavor" value={flavorDisplay} />
          </div>
        </div>
        {item.flavorNote && item.flavorNote !== "No" && (
          <span className="text-primary/60 pl-4">
            <span className="font-semibold text-[#764a4d]/90">Note:</span>{" "}
            {item.flavorNote}
          </span>
        )}
      </div>
    );
  };

  const renderItemAddons = (item: CartItem) => {
    if (!item.addons?.length) return null;

    return (
      <div className="mt-1.5 space-y-0.5 text-[11px] text-primary/60 pl-1">
        <span className="font-bold uppercase tracking-wide text-[#764a4d]/80 text-[10px]">
          Add-ons
        </span>
        {item.addons.map((addon, i) => (
          <div key={`${addon.addonId}-${i}`} className="flex justify-between gap-2">
            <span className="truncate">
              {addon.name}
              {addon.variantName ? ` · ${addon.variantName}` : ""}
            </span>
            <span className="shrink-0 font-medium text-[#231416]">
              x{item.quantity}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[16px] shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border-none group">
      <Link
        href={`/bakery-manufacturing-orders/orders/${order._id.toString()}`}
        className="block h-full"
      >
        {/* Header: Urgency & Meta */}
        <div className="px-5 pt-4 flex justify-between items-start">
          <div className="flex items-center gap-2">
            {isDelivery ? (
              <Truck className="w-4 h-4 text-[#764a4d]" />
            ) : (
              <Store className="w-4 h-4 text-[#764a4d]" />
            )}
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-xs font-bold leading-none",
                  isUrgent ? "text-red-600" : "text-[#231416]",
                )}
              >
                {format(primaryDate, "MMM d")}
              </span>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-medium",
                  isUrgent ? "text-red-500" : "text-[#764a4d]",
                )}
              >
                {primaryDateObj.timeSlot}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-[#A39E9A]">
            #{order._id.slice(-4)}
          </span>
        </div>

        {/* Customer Info */}
        <div className="px-5 py-2 mt-1 border-b border-dashed border-[#f0f0f0]">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg text-[#231416] leading-tight line-clamp-1">
              {order.customerInfo.name}
            </h3>
            {order.source === "instagram" ? (
              <Instagram className="w-3.5 h-3.5 text-[#764a4d]" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-[#764a4d]" />
            )}
          </div>
        </div>

        {/* The "Receipt" Block */}
        <div className="mx-4 my-2 p-3 bg-[#fdf2f1] rounded-md flex-1">
          <div className="space-y-4">
            {order.items.map((item, idx) => {
              const isDiscounted = !!item.discountId || !!item.discountName;
              const originalTotal = (
                item.originalPrice ?? item.price * item.quantity
              ).toFixed(2);

              return (
                <div key={idx} className="flex gap-3 items-start relative">
                  {/* Quantity Badge */}
                  <div className="shrink-0 w-6 h-6 rounded-full bg-[#2f1b23] flex items-center justify-center text-white text-[10px] font-bold mt-0.5 shadow-sm">
                    {item.quantity}
                  </div>

                  <div className="flex flex-col min-w-0 w-full">
                    {/* Item Header: Name & Price */}
                    <div className="flex justify-between items-start">
                      <span className="font-heading text-sm text-[#231416] leading-snug">
                        {item.name}
                      </span>
                      <div className="text-right flex flex-col items-end leading-none">
                        <span className="text-xs font-bold text-[#2f1b23]">
                          ${item.price}
                        </span>
                        {!!isDiscounted && (
                          <span className="text-[10px] text-gray-400 line-through Addon-red-400">
                            ${originalTotal}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Polymorphic Item Details */}
                    {renderItemDetails(item)}
                    {renderItemAddons(item)}

                    {!item.selectedConfig?.cake && item.inscription && (
                      <div className="flex items-start gap-1 mt-1.5 p-1 bg-white/50 rounded border border-[#764a4d]/10">
                        <ScrollText className="w-3 h-3 mt-0.5 shrink-0 text-[#764a4d]" />
                        <span className="text-[11px] italic text-[#231416] leading-tight">
                          &ldquo;{item.inscription}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Link>

      {/* Footer Actions */}
      <div className="px-5 pb-4 mt-auto flex flex-col gap-2 pt-2">
        <Select
          value={order.status}
          onValueChange={(val) =>
            onStatusChange(order._id, val as OrderStatus)
          }
        >
          <SelectTrigger className="h-8 w-full text-xs bg-white border-[#A39E9A]/20 focus:ring-[#2f1b23]/10 text-[#231416]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(OrderStatus).map((status) => (
              <SelectItem
                key={status}
                value={status}
                className="text-xs capitalize"
              >
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
