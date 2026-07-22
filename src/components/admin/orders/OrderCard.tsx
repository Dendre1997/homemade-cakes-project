"use client";

import { Order, OrderStatus, CartItem } from "@/types";
import { format, isToday, isTomorrow } from "date-fns";
import {
  Calendar,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Globe,
  ScrollText,
  Box,
  Cake,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { OrderItemTiersDisplay } from "@/components/shared/OrderItemTiersDisplay";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SocialHandleAnchor } from "@/components/ui/SocialHandleAnchor";

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
  const primaryDateObj = order.deliveryInfo.deliveryDates?.[0] || {
    date: order.createdAt,
    timeSlot: "N/A",
  };
  const primaryDate = new Date(primaryDateObj.date);
  const isUrgent = isToday(primaryDate) || isTomorrow(primaryDate);

  const images = (() => {
    const urls = new Set<string>();
    (order.referenceImages || []).forEach((url) => urls.add(url));
    order.items.forEach((item) => {
      if (item.imageUrl) urls.add(item.imageUrl);
      (item.imageUrls || []).forEach((url) => urls.add(url));
    });
    return Array.from(urls);
  })();
  const displayImage = images.length > 0 ? images[0] : null;

  const stopPropagation = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
  };

  const displayName =
    order.customerInfo.name ||
    order.customerInfo.socialNickname ||
    "Unknown Customer";
  const displayEmail = order.customerInfo.email;
  const displayPhone = order.customerInfo.phone;

  const hasSocialProfileLink =
    !!order.customerInfo.socialNickname?.trim() &&
    (order.customerInfo.socialPlatform === "instagram" ||
      order.customerInfo.socialPlatform === "facebook");

  const socialPlatform =
    order.customerInfo.socialPlatform ||
    (order.source === "instagram" || order.source === "facebook"
      ? order.source
      : undefined);

  const allergyNote = (() => {
    const notes = order.customerInfo.notes || "";
    if (notes.includes("ALLERGIES:")) {
      return notes.split("ALLERGIES:")[1]?.split("|")[0]?.trim() || null;
    }
    return null;
  })();

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

    if (item.selectedConfig?.quantityConfigId) {
      return item.selectedConfig.quantityConfigId;
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
      (!!item.selectedConfig?.items ||
        !!item.selectedConfig?.quantityConfigId)) ||
    String(item.flavor ?? "").includes("Combo:");

  const isSetItem = (item: CartItem) =>
    item.productType === "set" ||
    (!!item.selectedConfig?.items &&
      !item.selectedConfig?.cake &&
      item.selectedConfig.items.length > 0);

  const renderItemReceiptDetails = (item: CartItem) => {
    if (isComboItem(item)) {
      const bentoFlavor =
        resolveFlavorName(item.selectedConfig?.cake?.flavorId) ||
        (item.flavor?.includes("For Bento")
          ? item.flavor.split("For Bento")[1]?.trim()
          : undefined) ||
        resolveCakeFlavor(item);

      return (
        <>
          <div className="flex items-start gap-2">
            <Layers className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="text-xs leading-tight">
              {bentoFlavor || "Flavor TBD"}
            </span>
          </div>
          {item.selectedConfig?.cake?.inscription && (
            <div className="flex items-start gap-2 p-1.5 bg-white/50 rounded border border-[#764a4d]/10">
              <ScrollText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="text-[11px] italic text-[#231416] leading-tight">
                &ldquo;{item.selectedConfig.cake.inscription}&rdquo;
              </span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Box className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="text-[11px] text-gray-600 leading-snug">
              {item.selectedConfig?.items && item.selectedConfig.items.length > 0 ? (
                item.selectedConfig.items.map((boxItem, i) => (
                  <div key={i}>
                    {boxItem.count}x{" "}
                    {resolveFlavorName(boxItem.flavorId) || "Flavor"}
                  </div>
                ))
              ) : (
                <span>{item.flavor?.split("For Bento")[0]?.trim() || "Mix"}</span>
              )}
            </div>
          </div>
        </>
      );
    }

    if (isSetItem(item)) {
      return (
        <>
          <div className="flex items-start gap-2">
            <Box className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="text-[11px] text-gray-600 leading-snug">
              {item.selectedConfig?.items?.map((boxItem, i) => (
                <div key={i}>
                  {boxItem.count}x{" "}
                  {resolveFlavorName(boxItem.flavorId) || "Flavor"}
                </div>
              ))}
            </div>
          </div>
        </>
      );
    }

    const flavorDisplay = resolveCakeFlavor(item);

    if (item.tiers?.length) {
      return (
        <>
          <OrderItemTiersDisplay
            tiers={item.tiers}
            flavor={item.flavor}
            variant="compact"
            className="text-xs leading-tight"
            resolveFlavorName={resolveFlavorName}
          />
          {!item.selectedConfig?.cake?.inscription && item.inscription && (
            <div className="flex items-start gap-2 p-1.5 bg-white/50 rounded border border-[#764a4d]/10">
              <ScrollText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="text-[11px] italic text-[#231416] leading-tight">
                &ldquo;{item.inscription}&rdquo;
              </span>
            </div>
          )}
          {item.flavorNote && item.flavorNote !== "No" && (
            <p className="text-[11px] text-gray-500 pl-5 leading-snug">
              Note: {item.flavorNote}
            </p>
          )}
        </>
      );
    }

    return (
      <>
        <div className="flex items-start gap-2">
          <Layers className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="text-xs leading-tight">
            {flavorDisplay || "Flavor TBD"}
          </span>
        </div>
        {!item.selectedConfig?.cake?.inscription && item.inscription && (
          <div className="flex items-start gap-2 p-1.5 bg-white/50 rounded border border-[#764a4d]/10">
            <ScrollText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="text-[11px] italic text-[#231416] leading-tight">
              &ldquo;{item.inscription}&rdquo;
            </span>
          </div>
        )}
        {item.designInstructions && (
          <div className="flex items-start gap-2">
            <Box className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-600 line-clamp-3 leading-snug">
              {item.designInstructions}
            </p>
          </div>
        )}
        {item.flavorNote && item.flavorNote !== "No" && (
          <p className="text-[11px] text-gray-500 pl-5 leading-snug">
            Note: {item.flavorNote}
          </p>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[16px] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-none relative">
      <Link
        href={`/bakery-manufacturing-orders/orders/${order._id.toString()}`}
        className="block h-full group"
      >
        {/* Header: Date & Meta */}
        <div className="px-5 pt-4 flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#764a4d]" />
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-xs font-bold leading-none",
                  isUrgent ? "text-red-600" : "text-[#231416]"
                )}
              >
                {format(primaryDate, "MMM d")}
              </span>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-medium",
                  isUrgent ? "text-red-500" : "text-[#764a4d]"
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
        <div
          className={cn(
            "px-5 py-2 mt-1 border-dashed border-[#f0f0f0]",
            hasSocialProfileLink ? "border-b-0 pb-1" : "border-b"
          )}
        >
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg text-[#231416] leading-tight line-clamp-1">
              {displayName}
            </h3>
            {socialPlatform === "instagram" ? (
              <Instagram className="w-3.5 h-3.5 text-[#764a4d]" />
            ) : socialPlatform === "facebook" ? (
              <Facebook className="w-3.5 h-3.5 text-[#764a4d]" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-[#764a4d]" />
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#764a4d]/70 mt-1">
            {displayEmail && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> {displayEmail}
              </span>
            )}
            {displayPhone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {displayPhone}
              </span>
            )}
          </div>
        </div>

        {/* Visuals - Horizontal scroll for images if multiple */}
        {displayImage && (
          <div
            className="px-5 py-3 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar"
            onClick={stopPropagation}
          >
            <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-black/5 shadow-sm">
              <Image
                src={displayImage}
                alt="Reference"
                fill
                quality={90}
                className="object-cover"
              />
            </div>
            {images.slice(1).map((img, idx) => (
              <div
                key={idx}
                className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-black/5 shadow-sm"
              >
                <Image
                  src={img}
                  alt={`Ref ${idx + 2}`}
                  fill
                  quality={90}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* The "Receipt" Block */}
        <div className="mx-4 my-2 p-3 bg-[#fdf2f1] rounded-md flex-1 text-sm">
          <div className="space-y-4">
            {order.items.map((item, idx) => {
              const sizeDisplay = resolveSizeDisplay(item);
              const isDiscounted = !!item.discountId || !!item.discountName;
              const lineTotal = (
                item.rowTotal ?? item.price * item.quantity
              ).toFixed(2);

              return (
                <div
                  key={item.id || idx}
                  className={cn(
                    "space-y-3",
                    idx > 0 && "pt-3 border-t border-[#764a4d]/10"
                  )}
                >
                  <div className="flex justify-between items-center border-b border-[#764a4d]/10 pb-2">
                    <span className="font-heading text-[#231416] uppercase text-[10px] tracking-wider line-clamp-1 pr-2">
                      {item.quantity > 1 ? `${item.quantity}x ` : ""}
                      {item.name}
                    </span>
                    <div className="text-right shrink-0">
                      <span className="text-[#764a4d] text-xs font-bold">
                        ${lineTotal}
                      </span>
                      {isDiscounted && item.originalPrice != null && (
                        <span className="block text-[10px] text-gray-400 line-through">
                          ${(item.originalPrice * item.quantity).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {sizeDisplay && (
                    <div className="flex justify-end -mt-1">
                      <span className="text-[#764a4d] text-[10px] font-bold">
                        {sizeDisplay}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 text-[#764a4d]">
                    {renderItemReceiptDetails(item)}

                    {item.addons && item.addons.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Cake className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div className="text-[11px] text-gray-600 leading-snug">
                          {item.addons.map((addon, i) => (
                            <div key={`${addon.addonId}-${i}`}>
                              {addon.name}
                              {addon.variantName ? ` (${addon.variantName})` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Allergies Row */}
            {allergyNote && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-red-700 font-semibold text-[10px] leading-tight">
                  {allergyNote}
                </p>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Outside <Link>: social profile link */}
      {hasSocialProfileLink && (
        <div className="px-5 pb-2 pt-0 border-b border-dashed border-[#f0f0f0]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A39E9A] mb-1">
            Open profile
          </p>
          <SocialHandleAnchor
            platform={order.customerInfo.socialPlatform}
            nickname={order.customerInfo.socialNickname}
            showPlatform
            className="text-[#764a4d] font-semibold hover:underline text-sm break-all"
          />
        </div>
      )}

      {/* Footer: Price & Status */}
      <div className="px-5 pb-4 pt-2 mt-auto border-t border-gray-50 bg-gray-50/30">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center h-9 px-3 rounded-md border border-[#764a4d]/10 bg-white">
            <span className="text-xs font-semibold text-[#764a4d]/70">
              Total
            </span>
            <span className="font-bold text-sm text-[#231416]">
              ${order.totalAmount.toFixed(2)}
            </span>
          </div>
          <div onClick={stopPropagation}>
            <Select
              value={order.status}
              onValueChange={(val) =>
                onStatusChange(order._id, val as OrderStatus)
              }
            >
              <SelectTrigger className="h-9 w-full text-xs bg-white border-[#764a4d]/10 focus:ring-[#764a4d]/10 text-[#231416]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(OrderStatus).map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    className="text-xs capitalize"
                  >
                    {status.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
