"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Order, CartItem, Diameter } from "@/types";
import { format } from "date-fns";
import { Truck, Store, DollarSign } from "lucide-react";
import HeaderLogo from "@/components/ui/HeaderLogo";
import { SocialHandleAnchor } from "@/components/ui/SocialHandleAnchor";

interface ClientReceiptCardProps {
  order: Order;
  diameters: Diameter[];
  flavorMap: Record<string, string>;
  eTransferEmail?: string;
  pickupAddress?: string;
}

const formatDeliveryAddress = (
  address:
    | string
    | { street?: string; unit?: string; city?: string; postalCode?: string }
    | undefined
): string => {
  if (!address) return "";
  if (typeof address === "string") return address.trim();

  const streetLine = [address.street, address.unit].filter(Boolean).join(", ");
  return [streetLine, address.city, address.postalCode].filter(Boolean).join(", ");
};

const ReceiptItemImage = ({ effectiveImageUrl, alt }: { effectiveImageUrl: string | undefined, alt: string }) => {
  const [dataUri, setDataUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!effectiveImageUrl) {
        setDataUri(undefined);
        return;
    }
    setError(false);
    
    if (effectiveImageUrl.startsWith('data:')) {
        setDataUri(effectiveImageUrl);
        return;
    }

    // Always fetch a fresh copy for the base64 conversion
    const proxyUrl = effectiveImageUrl.startsWith('/') 
        ? `${effectiveImageUrl}?cb=${Date.now()}`
        : `/_next/image?url=${encodeURIComponent(effectiveImageUrl)}&w=128&q=75&cb=${Date.now()}`;

    fetch(proxyUrl)
      .then(res => {
          if (!res.ok) throw new Error("Failed to fetch image proxy");
          return res.blob();
      })
      .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => setDataUri(reader.result as string);
          reader.readAsDataURL(blob);
      })
      .catch(err => {
          console.error("Failed loading image to Data URI:", err);
          setError(true);
      });
  }, [effectiveImageUrl]);

  if (!effectiveImageUrl || error) {
      return (
          <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
              <span className="text-[10px] text-primary/40 font-medium">No Img</span>
          </div>
      );
  }

  return dataUri ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img 
        src={dataUri} 
        alt={alt} 
        className="w-14 h-14 object-cover rounded-xl shadow-sm shrink-0 border border-gray-100 bg-gray-50"
      />
  ) : (
      <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 animate-pulse"></div>
  );
};

export const ClientReceiptCard = ({
  order,
  diameters,
  flavorMap,
  eTransferEmail = "",
  pickupAddress,
}: ClientReceiptCardProps) => {
  const isPaid = order.isPaid;
  const paymentMethod = order.paymentDetails?.expectedMethod;
  const showPaymentInstructions =
    !isPaid &&
    (paymentMethod === "cash" || paymentMethod === "e-transfer");
  const orderIdShort = order._id.toString().slice(-6).toUpperCase();
  const dateFormatted = order.createdAt ? format(new Date(order.createdAt), "MMMM d, yyyy") : "";

  // Get flavor name
  const getFlavorName = (id?: string) => {
    if (!id) return "";
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id)) {
      return flavorMap[id] || id;
    }
    return id;
  };

  // Get diameter name
  const getDiameterName = (id?: string) => {
    if (!id) return "";
    const d = diameters.find((dia) => dia._id === id);
    return d ? d.name : id;
  };

  // 1. Extras (Addons) separation across all items
  const addons = order.items.flatMap((item) =>
    (item.addons || []).map((addon) => ({
      ...addon,
      itemQuantity: item.quantity,
    }))
  );

  const addonsCost = order.items.reduce((acc, item) => {
    const itemAddonsCost = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0);
    return acc + (itemAddonsCost * item.quantity);
  }, 0);

  // 2. Base Cake Price (TotalAmount - AddonsCost)
  const baseCakePrice = Math.max(0, order.totalAmount - addonsCost);

  const isDelivery = order.deliveryInfo?.method === "delivery";
  const deliveryAddressText = formatDeliveryAddress(
    order.deliveryInfo?.address as
      | string
      | { street?: string; unit?: string; city?: string; postalCode?: string }
      | undefined
  );
  const pickupAddressText =
    pickupAddress?.trim() || "East Village, Calgary";

  return (
    <div className="bg-primary/10 text-primary w-[400px] rounded-2xl shadow-xl overflow-hidden font-sans border border-primary/60 flex flex-col pt-6 pb-2">
      {/* Header */}
      <div className="px-6 text-center space-y-1 mb-6">
        <HeaderLogo size={100} />
        <p className="text-primary/60 text-sm uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
          Order Summary
          {/* {isPaid ? (
            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">PAID</span>
          ) : (
            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">PENDING</span>
          )} */}
        </p>
      </div>

      {/* Meta details */}
      <div className="px-6 py-4 bg-gray-50/80 border-y border-gray-100 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
        {orderIdShort && (
          <div>
            <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Order ID</p>
            <p className="font-semibold font-mono">#{orderIdShort}</p>
          </div>
        )}
        {dateFormatted && (
          <div>
            <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Date</p>
            <p className="font-medium">{dateFormatted}</p>
          </div>
        )}
        {order.customerInfo && (
          <div className="col-span-2">
            <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">Customer</p>
            {order.customerInfo.name && order.customerInfo.name.trim() !== "" && (
              <p className="font-semibold text-base">{order.customerInfo.name}</p>
            )}
            {order.customerInfo.phone && order.customerInfo.phone.trim() !== "" && (
              <p className="text-primary/40">{order.customerInfo.phone}</p>
            )}
            {/* Hide bogus emails */}
            {order.customerInfo.email &&
              order.customerInfo.email.trim() !== "" &&
              !order.customerInfo.email.includes("placeholder.com") && (
                <p className="text-primary/40">{order.customerInfo.email}</p>
              )}
            {order.customerInfo.socialPlatform &&
              order.customerInfo.socialNickname &&
              order.customerInfo.socialNickname.trim() !== "" && (
                <p className="text-primary/50 mt-1 text-sm">
                  <span className="font-semibold text-primary/60">
                    {order.customerInfo.socialPlatform.charAt(0).toUpperCase() + order.customerInfo.socialPlatform.slice(1)}:{" "}
                  </span>
                  <span className="text-primary/80 font-medium">
                    {order.customerInfo.socialNickname}
                  </span>
                </p>
              )}
          </div>
        )}
      </div>

      {/* Fulfillment (Display only if method, date, or timeSlot is available) */}
      {order.deliveryInfo && order.deliveryInfo.method && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
            {isDelivery ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />}
            {isDelivery ? "Delivery To" : "Pickup"}
          </h3>
          
          {order.deliveryInfo.deliveryDates && order.deliveryInfo.deliveryDates.length > 0 && (
            <div className="space-y-3">
              {order.deliveryInfo.deliveryDates.map((dateObj, idx) => (
                <div key={idx} className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/50">
                  {dateObj.date && (
                    <p className="font-semibold text-primary/90">
                      {format(new Date(dateObj.date), "EEE, MMMM d, yyyy")}
                    </p>
                  )}
                  {dateObj.timeSlot && dateObj.timeSlot.trim() !== "" && (
                    <p className="text-sm text-primary/40 mt-0.5">{dateObj.timeSlot}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {isDelivery ? (
            <div className="mt-3">
              <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-1">
                Delivery Address:
              </p>
              <p className="text-sm font-medium text-primary/80">
                {deliveryAddressText || "Pending"}
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-1">
                Pickup Address:
              </p>
              <p className="text-sm font-medium text-primary/80">
                {pickupAddressText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Line Items */}
      <div className="px-6 py-4 space-y-4">
        <p className="text-primary/60 text-xs uppercase font-bold tracking-wider">Items</p>
        {order.items.map((item: CartItem, idx: number) => {
          const isCustom = item.productType === 'custom' || item.isCustom;
          const displaySize = isCustom ? item.customSize || getDiameterName(item.diameterId || item.selectedConfig?.cake?.diameterId) : getDiameterName(item.diameterId);
          const displayFlavor = isCustom ? item.customFlavor || getFlavorName(item.selectedConfig?.cake?.flavorId || item.flavor) : getFlavorName(item.flavor || item.selectedConfig?.cake?.flavorId);

          const fallbackIdx = order.referenceImages ? Math.min(idx, Math.max(0, order.referenceImages.length - 1)) : 0;
          const effectiveImageUrl = item.imageUrl || (order.referenceImages && order.referenceImages.length > 0 ? order.referenceImages[fallbackIdx] : undefined);
          const itemImages = item.imageUrls?.length ? item.imageUrls : (effectiveImageUrl ? [effectiveImageUrl] : []);

          return (
            <div key={idx} className="flex flex-col pb-4 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="flex items-start gap-4">
                <div className="flex flex-wrap gap-1.5 shrink-0 max-w-[120px]">
                  {itemImages.length > 0 ? itemImages.map((img, i) => (
                    <ReceiptItemImage key={i} effectiveImageUrl={img} alt={`${item.name} ${i}`} />
                  )) : (
                    <ReceiptItemImage effectiveImageUrl={undefined} alt={item.name} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm text-primary/60 leading-snug">{item.name}</p>
                    <p className="font-semibold text-sm shrink-0">
                      ${(item.rowTotal || (item.price * item.quantity)).toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-1 text-xs text-primary/40 font-medium space-y-0.5">
                    {displaySize && displaySize.trim() !== "" && <p>Size: {displaySize}</p>}
                    {displayFlavor && displayFlavor.trim() !== "" && <p>Flavor: {displayFlavor}</p>}
                    {item.isCombo && item.selectedConfig?.cake && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Center Cake:</span>{' '}
                        {flavorMap?.[item.selectedConfig.cake.flavorId] || item.selectedConfig.cake.flavorId}
                        {item.selectedConfig.cake.inscription && ` — "${item.selectedConfig.cake.inscription}"`}
                      </div>
                    )}
                    {item.isCombo && item.selectedConfig?.items && item.selectedConfig.items.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Box ({item.selectedConfig.quantityConfigId}):</span>{' '}
                        {item.selectedConfig.items
                          .map((si: any) => `${si.count}x ${flavorMap?.[si.flavorId] || si.flavorId}`)
                          .join(', ')}
                      </div>
                    )}
                    {item.flavorNote && item.flavorNote !== "No" && <p>Flavor Note: {item.flavorNote}</p>}
                    {item.quantity > 0 && <p>Qty: {item.quantity}</p>}
                    {item.inscription && item.inscription.trim() !== "" && <p>Inscription: {item.inscription}</p>}
                    {item.designInstructions && 
                     item.designInstructions.trim() !== "" && 
                     item.designInstructions.trim().toLowerCase() !== "same as on reference" && (
                       <p className="whitespace-pre-wrap">Instructions: {item.designInstructions}</p>
                     )}
                  </div>
                </div>
              </div>

              {/* Extras (Addons) rendered separately under each item */}
              {item.addons && item.addons.length > 0 && (
                <div className="mt-3 space-y-2 pt-2 border-t border-gray-100/50">
                  <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">Add-ons</p>
                  {item.addons.map((addon, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-3 text-xs text-primary/60 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-primary/70">{addon.name}</p>
                        {addon.variantName && addon.variantName.trim() !== "" && (
                          <p className="text-[10px] text-primary/45">{addon.variantName}</p>
                        )}
                      </div>
                      <p className="font-semibold text-primary/80">
                        {addon.price > 0 ? `+$${addon.price.toFixed(2)}` : "Free"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Financial Breakdown (Properly Separated Subtotal and Total Sections) */}
      <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-5 mt-auto">
        <div className="space-y-2.5 text-sm font-medium text-primary/40">
          {/* Base Cake Price */}
          <div className="flex justify-between">
            <span>Base Cake</span>
            <span>${baseCakePrice.toFixed(2)}</span>
          </div>
          
          {/* Extras (Addons breakdown) */}
          {addons.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">Extras (Add-ons)</p>
              {addons.map((addon, idx) => (
                <div key={idx} className="flex justify-between items-center pl-2 text-xs">
                  <span className="text-primary/60">
                    {addon.name}
                    {addon.variantName && addon.variantName.trim() !== "" && ` · ${addon.variantName}`}
                    {addon.itemQuantity > 1 && ` (x${addon.itemQuantity})`}
                  </span>
                  <span className="font-semibold text-primary/70">
                    {addon.price > 0 ? `+$${(addon.price * addon.itemQuantity).toFixed(2)}` : "Free"}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {order.discountInfo && order.discountInfo.amount > 0 && (
            <div className="flex justify-between text-green-600 bg-green-50 px-2 py-1 -mx-2 rounded-md">
              <span className="flex items-center gap-1">
                Discount
                {(order.discountInfo.code || order.discountInfo.name) && (
                  <span className="text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">
                    {order.discountInfo.code || order.discountInfo.name}
                  </span>
                )}
              </span>
              <span>-${order.discountInfo.amount.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200/60">
          <span className="font-extrabold text-lg text-primary/40">Total</span>
          <span className="font-extrabold text-2xl text-primary">${order.totalAmount.toFixed(2)}</span>
        </div>

        {showPaymentInstructions && (
          <div className="mt-4 pt-4 border-t border-accent/20">
            <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-2.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Payment Instructions
            </h3>
            <div className="bg-accent/5 p-4 rounded-xl border border-accent/20 text-sm text-primary/80 leading-relaxed">
              {paymentMethod === "cash" ? (
                <p>
                  <span className="font-semibold text-primary">Instruction:</span>{" "}
                  Pay the total amount of{" "}
                  <span className="font-bold text-primary">
                    ${order.totalAmount.toFixed(2)}
                  </span>{" "}
                  at the pickup in cash.
                </p>
              ) : (
                <p>
                  <span className="font-semibold text-primary">Instruction:</span>{" "}
                  Pay the total amount of{" "}
                  <span className="font-bold text-primary">
                    ${order.totalAmount.toFixed(2)}
                  </span>{" "}
                  the day before pickup by sending an e-transfer to{" "}
                  {eTransferEmail.trim() ? (
                    <span className="font-bold text-primary break-all">
                      {eTransferEmail.trim()}
                    </span>
                  ) : (
                    <span className="italic text-primary/50">
                      the bakery e-transfer address (see confirmation email)
                    </span>
                  )}
                  .
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center bg-gray-50 text-xs font-medium text-primary/40 border-t border-primary/100">
        <p className="mb-1 text-primary/40 font-semibold">Thank you for your order! 💖</p>
        <p>www.d-kcreations.com</p>
      </div>
    </div>
  );
};
