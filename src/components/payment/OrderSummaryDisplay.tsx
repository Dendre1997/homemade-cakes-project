"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Truck, Store } from "lucide-react";
import HeaderLogo from "@/components/ui/HeaderLogo";
import { PublicOrderSummary } from "@/types";

interface OrderSummaryDisplayProps {
  data: PublicOrderSummary;
  /** Interactive payment block (copy buttons) rendered inside the same card. */
  paymentSection?: React.ReactNode;
}

/**
 * Loads an image through the Next.js image proxy and converts it to a data URI
 * (same fallback/proxy pattern used by the admin ClientReceiptCard).
 */
const ReceiptItemImage = ({
  effectiveImageUrl,
  alt,
  sizeClass = "w-20 h-20",
}: {
  effectiveImageUrl: string | undefined;
  alt: string;
  sizeClass?: string;
}) => {
  const [dataUri, setDataUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!effectiveImageUrl) {
      setDataUri(undefined);
      return;
    }
    setError(false);

    if (effectiveImageUrl.startsWith("data:")) {
      setDataUri(effectiveImageUrl);
      return;
    }

    const proxyUrl = effectiveImageUrl.startsWith("/")
      ? `${effectiveImageUrl}?cb=${Date.now()}`
      : `/_next/image?url=${encodeURIComponent(effectiveImageUrl)}&w=256&q=75&cb=${Date.now()}`;

    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch image proxy");
        return res.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setDataUri(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        console.error("Failed loading image to Data URI:", err);
        setError(true);
      });
  }, [effectiveImageUrl]);

  if (!effectiveImageUrl || error) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0`}
      >
        <span className="text-[10px] text-primary/40 font-medium">No Img</span>
      </div>
    );
  }

  return dataUri ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={dataUri}
      alt={alt}
      className={`${sizeClass} object-cover rounded-xl shadow-sm shrink-0 border border-gray-100 bg-gray-50`}
    />
  ) : (
    <div
      className={`${sizeClass} rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 animate-pulse`}
    ></div>
  );
};

export const OrderSummaryDisplay = ({
  data,
  paymentSection,
}: OrderSummaryDisplayProps) => {
  const { orderIdShort, createdAt, customer, fulfillment, items, pricing } = data;

  const dateFormatted = createdAt
    ? format(new Date(createdAt), "MMMM d, yyyy")
    : "";

  const isDelivery = fulfillment.method === "delivery";
  const pickupAddressText = data.pickupAddress?.trim() || "East Village, Calgary";

  return (
    <div className="bg-primary/10 text-primary w-full max-w-[440px] rounded-2xl shadow-xl overflow-hidden font-sans border border-primary/60 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 text-center space-y-1 mb-4">
        <HeaderLogo size={90} />
        <p className="text-primary/60 text-sm uppercase tracking-widest font-semibold">
          Invoice / Order Summary
        </p>
      </div>

      {/* Meta details */}
      <div className="px-6 py-4 bg-gray-50/80 border-y border-gray-100 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
        {orderIdShort && (
          <div>
            <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">
              Order ID
            </p>
            <p className="font-semibold font-mono">#{orderIdShort}</p>
          </div>
        )}
        {dateFormatted && (
          <div>
            <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">
              Date
            </p>
            <p className="font-medium">{dateFormatted}</p>
          </div>
        )}
        {(customer.name ||
          customer.phoneMasked ||
          customer.emailMasked ||
          customer.socialNickname) && (
          <div className="col-span-2">
            <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">
              Customer
            </p>
            {customer.name && customer.name.trim() !== "" && (
              <p className="font-semibold text-base">{customer.name}</p>
            )}
            {customer.phoneMasked && (
              <p className="text-primary/40">{customer.phoneMasked}</p>
            )}
            {customer.emailMasked && (
              <p className="text-primary/40">{customer.emailMasked}</p>
            )}
            {customer.socialPlatform &&
              customer.socialNickname &&
              customer.socialNickname.trim() !== "" && (
                <p className="text-primary/50 mt-1 text-sm">
                  <span className="font-semibold text-primary/60">
                    {customer.socialPlatform.charAt(0).toUpperCase() +
                      customer.socialPlatform.slice(1)}
                    :{" "}
                  </span>
                  <span className="text-primary/80 font-medium">
                    {customer.socialNickname}
                  </span>
                </p>
              )}
          </div>
        )}
      </div>

      {/* Fulfillment */}
      {fulfillment.method && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
            {isDelivery ? (
              <Truck className="w-4 h-4" />
            ) : (
              <Store className="w-4 h-4" />
            )}
            {isDelivery ? "Delivery To" : "Pickup"}
          </h3>

          {fulfillment.deliveryDates && fulfillment.deliveryDates.length > 0 && (
            <div className="space-y-3">
              {fulfillment.deliveryDates.map((dateObj, idx) => (
                <div
                  key={idx}
                  className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/50"
                >
                  {dateObj.date && (
                    <p className="font-semibold text-primary/90">
                      {format(new Date(dateObj.date), "EEE, MMMM d, yyyy")}
                    </p>
                  )}
                  {dateObj.timeSlot && dateObj.timeSlot.trim() !== "" && (
                    <p className="text-sm text-primary/40 mt-0.5">
                      {dateObj.timeSlot}
                    </p>
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
                {fulfillment.addressText || "Pending"}
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
      <div className="px-6 py-4 space-y-5">
        <p className="text-primary/60 text-xs uppercase font-bold tracking-wider">
          Items
        </p>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col pb-4 border-b border-gray-50 last:border-0 last:pb-0"
          >
            {/* Name + price */}
            <div className="flex justify-between items-start gap-2">
              <p className="font-bold text-sm text-primary/70 leading-snug">
                {item.name}
              </p>
              <p className="font-semibold text-sm shrink-0">
                ${item.rowTotal.toFixed(2)}
              </p>
            </div>

            {/* Meta */}
            <div className="mt-1 text-xs text-primary/40 font-medium space-y-0.5">
              {item.displaySize && item.displaySize.trim() !== "" && (
                <p>Size: {item.displaySize}</p>
              )}
              {item.displayFlavor && item.displayFlavor.trim() !== "" && (
                <p>Flavor: {item.displayFlavor}</p>
              )}
              {item.isCombo && item.comboCenter && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Center Cake:</span>{" "}
                  {item.comboCenter.flavorName}
                  {item.comboCenter.inscription &&
                    ` — "${item.comboCenter.inscription}"`}
                </div>
              )}
              {item.isCombo &&
                item.comboBox &&
                item.comboBox.items.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">
                      Box ({item.comboBox.label}):
                    </span>{" "}
                    {item.comboBox.items
                      .map((si) => `${si.count}x ${si.flavorName}`)
                      .join(", ")}
                  </div>
                )}
              {item.flavorNote && item.flavorNote !== "No" && (
                <p>Flavor Note: {item.flavorNote}</p>
              )}
              {item.quantity > 0 && <p>Qty: {item.quantity}</p>}
              {item.inscription && item.inscription.trim() !== "" && (
                <p>Inscription: {item.inscription}</p>
              )}
              {item.designInstructions &&
                item.designInstructions.trim() !== "" &&
                item.designInstructions.trim().toLowerCase() !==
                  "same as on reference" && (
                  <p className="whitespace-pre-wrap">
                    Instructions: {item.designInstructions}
                  </p>
                )}
            </div>

            {/* Image gallery — ALL images shown as a wrapping grid of thumbnails */}
            {item.imageUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.imageUrls.map((img, i) => (
                  <ReceiptItemImage
                    key={i}
                    effectiveImageUrl={img}
                    alt={`${item.name} reference ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Extras (Addons) */}
            {item.addons.length > 0 && (
              <div className="mt-3 space-y-2 pt-2 border-t border-gray-100/50">
                <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">
                  Add-ons
                </p>
                {item.addons.map((addon, aIdx) => (
                  <div
                    key={aIdx}
                    className="flex items-center gap-3 text-xs text-primary/60 bg-gray-50/50 p-2 rounded-xl border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary/70">{addon.name}</p>
                      {addon.variantName && addon.variantName.trim() !== "" && (
                        <p className="text-[10px] text-primary/45">
                          {addon.variantName}
                        </p>
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
        ))}
      </div>

      {/* Financial Breakdown */}
      <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-5">
        <div className="space-y-2.5 text-sm font-medium text-primary/40">
          <div className="flex justify-between">
            <span>Base Cake</span>
            <span>${pricing.baseCakePrice.toFixed(2)}</span>
          </div>

          {pricing.addons.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">
                Extras (Add-ons)
              </p>
              {pricing.addons.map((addon, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center pl-2 text-xs"
                >
                  <span className="text-primary/60">
                    {addon.name}
                    {addon.variantName &&
                      addon.variantName.trim() !== "" &&
                      ` · ${addon.variantName}`}
                    {addon.itemQuantity > 1 && ` (x${addon.itemQuantity})`}
                  </span>
                  <span className="font-semibold text-primary/70">
                    {addon.price > 0
                      ? `+$${(addon.price * addon.itemQuantity).toFixed(2)}`
                      : "Free"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {pricing.discount && pricing.discount.amount > 0 && (
            <div className="flex justify-between text-green-600 bg-green-50 px-2 py-1 -mx-2 rounded-md">
              <span className="flex items-center gap-1">
                Discount
                {(pricing.discount.code || pricing.discount.name) && (
                  <span className="text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm">
                    {pricing.discount.code || pricing.discount.name}
                  </span>
                )}
              </span>
              <span>-${pricing.discount.amount.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200/60">
          <span className="font-extrabold text-lg text-primary/40">Total</span>
          <span className="font-extrabold text-2xl text-primary">
            ${pricing.total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Payment Instructions (dashed divider = receipt "tear line") ── */}
      {paymentSection && (
        <div className="relative px-6 py-6 bg-card-background border-t-2 border-dashed border-primary/25">
          {/* Notches to reinforce the tear-off receipt feel */}
          <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-background border border-primary/20" />
          <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-background border border-primary/20" />
          {paymentSection}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-6 text-center bg-gray-50 text-xs font-medium text-primary/40 border-t border-primary/10">
        <p className="mb-1 text-primary/40 font-semibold">
          Thank you for your order! 💖
        </p>
        <p>www.d-kcreations.com</p>
      </div>
    </div>
  );
};

export default OrderSummaryDisplay;
