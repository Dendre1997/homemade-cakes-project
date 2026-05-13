import { CustomOrderFormData } from "@/lib/validation/customOrderSchema";
import { Info, Sparkles, DollarSign } from "lucide-react";
import { format } from "date-fns";
import HeaderLogo from "@/components/ui/HeaderLogo";
import { SocialHandleAnchor } from "@/components/ui/SocialHandleAnchor";
import { socialPlatformLabel } from "@/lib/socialLinks";
import { Button } from "@/components/ui/Button"

interface Step6Props {
  orderData: CustomOrderFormData | null;
  /** custom_orders document id from POST response */
  customOrderId?: string | null;
}

/**
 * Official bakery DM handle for reverse-ping (no @ in env values).
 * Uses per-platform vars when set; falls back to NEXT_PUBLIC_BAKERY_DM_HANDLE.
 */
function getBakeryDmNicknameForPlatform(platform: "instagram" | "facebook"): string {
  const legacy = (process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE ?? "").trim().replace(/^@+/, "");
  if (platform === "instagram") {
    const raw = (process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE_INSTAGRAM ?? "").trim().replace(/^@+/, "");
    return raw || legacy;
  }
  const raw = (process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE_FACEBOOK ?? "").trim().replace(/^@+/, "");
  return raw || legacy;
}

export default function Step6Success({ orderData, customOrderId }: Step6Props) {


  if (!orderData) return null;

  const { name, socialNickname, socialPlatform } = orderData.contact;
  const hasSocialPlatform = !!socialPlatform;

  // Build the display name based on what's available
  const displayName = (() => {
    const firstName = name?.trim().split(" ")[0] || "";
    const nickPart = socialNickname?.trim() || "";
    const platformPart = hasSocialPlatform
      ? `${socialPlatform!.charAt(0).toUpperCase() + socialPlatform!.slice(1)} `
      : "";
    if (firstName && nickPart) return `${firstName} (${platformPart}${nickPart})`;
    return firstName || nickPart || "there";
  })();

  // Contact method adapts to what the customer chose
  const contactMethod =
    hasSocialPlatform && socialNickname
      ? `via ${socialPlatform!.charAt(0).toUpperCase() + socialPlatform!.slice(1)} at ${socialNickname}`
      : "via phone or email";
  const addons = orderData.addons ?? [];
  const pb = orderData.priceBreakdown;
  const hasPricing = pb !== undefined && (pb.grandTotal ?? 0) > 0;

  const baseCakePrice = pb?.baseCakePrice ?? 0;
  const flavorUpcharge = pb?.flavorUpcharge ?? 0;
  const addonsCost = pb?.addonsCost ?? 0;
  const grandTotal = pb?.grandTotal ?? orderData.approximatePrice ?? 0;

  // Flavor name is already in details.flavor (set by Step 3's compilePayload)
  const flavorName = orderData.details?.flavor ?? "";



  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-heading font-bold text-primary mb-2">
        Request Received!
      </h2>
      <p className="text-primary/70 mb-8 max-w-md text-center">
        Thank you, {displayName}! We will review your custom request and contact
        you {contactMethod} with a price quote.
      </p>

      {/* Reverse ping — customer must DM the bakery so inbox threading matches */}
      {hasSocialPlatform && (
        <div
          role="status"
          className="mb-8 w-full max-w-lg rounded-2xl border border-primary/10 bg-white p-6 shadow-lg shadow-primary/5"
        >
          <div className="flex items-start gap-4">
            <div className="min-w-0 space-y-2 text-center">
              <p className="text-sm leading-relaxed text-primary/80">
                If you’d like, you can also send us a quick message at{" "}
                <SocialHandleAnchor
                  platform={socialPlatform}
                  nickname={getBakeryDmNicknameForPlatform(socialPlatform!)}
                  showPlatform
                  className="text-primary font-semibold hover:underline text-sm break-all"
                />{" "}
                {customOrderId ? (
                  <>
                    and mention your request number
                    <span className="font-semibold text-primary">
                      {" "}
                      #{customOrderId.slice(-4)}
                    </span>
                  </>
                ) : (
                  <>
                    mentioning your{" "}
                    <span className="font-semibold text-primary">
                      custom cake request
                    </span>{" "}
                    so we can easily find you in our inbox.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Digital Receipt Card */}
      <div className="w-full max-w-[400px] rounded-2xl shadow-xl overflow-hidden scale-95 sm:scale-100 mx-auto border-primary/10 border bg-primary/5">
        <div className="bg-primary/10 text-primary w-full h-full font-sans flex flex-col pt-6 pb-0">
          {/* Header */}
          <div className="px-6 text-center space-y-1 mb-6">
            <div className="w-24 h-24  flex items-center justify-center mx-auto mb-3">
              <HeaderLogo />
            </div>
            <p className="text-primary/60 text-sm uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
              Request Summary
              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                PENDING QUOTE
              </span>
            </p>
          </div>

          {/* Meta details */}
          <div className="px-6 py-4 bg-gray-50/80 border-y border-gray-100 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div className="col-span-2">
              <p className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-0.5">
                Customer
              </p>
              {orderData.contact.name ? (
                <>
                  <p className="font-semibold text-base">
                    {orderData.contact.name}
                  </p>
                  {orderData.contact.socialNickname && (
                    <p className="text-primary/50 text-xs mt-0.5">
                      {orderData.contact.socialPlatform}
                    </p>
                  )}
                </>
              ) : (
                <p className="font-semibold text-base">
                  {orderData.contact.socialNickname}
                </p>
              )}
              <p className="text-primary/60 font-medium">
                {orderData.contact.phone}
              </p>
              {orderData.contact.email && (
                <p className="text-primary/50 text-xs mt-0.5">
                  {orderData.contact.email}
                </p>
              )}
            </div>
          </div>

          {/* Fulfillment */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              Requested Date & Time
            </h3>
            <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
              <p className="font-semibold text-primary/90 uppercase text-sm mb-1">
                {orderData.deliveryMethod}
              </p>
              <p className="text-sm font-medium text-primary/70 mb-1">
                Date: {format(new Date(orderData.date), "MMM d, yyyy")}
              </p>
              <p className="text-sm font-medium text-primary/70">
                Time Slot: {orderData.timeSlot}
              </p>

              {orderData.deliveryMethod === "pickup" && (
                <div className="mt-2 pt-2 border-t border-primary/5">
                  <span className="text-xs font-semibold text-primary/80 block mb-0.5">
                    Location:
                  </span>
                  <p className="text-xs text-primary/60 leading-relaxed">
                    Location will be provided in final quote after confirmation.
                  </p>
                </div>
              )}
              {orderData.deliveryMethod === "delivery" && (
                <div className="mt-2 pt-2 border-t border-primary/5">
                  <p className="text-xs text-primary/50 italic leading-relaxed">
                    The baker will calculate delivery options based on your
                    location and include them in the final quote.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Cake Specifications ─────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Cake Specifications
            </h3>

            <div className="flex justify-between items-center mb-2">
              <p className="font-extrabold text-sm text-primary/80">
                {orderData.category}
              </p>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wide">
                Custom
              </span>
            </div>

            <div className="text-xs text-primary/60 space-y-1.5 bg-primary/5 p-3 rounded-xl border border-primary/10">
              {orderData.details?.size && (
                <div className="flex gap-2">
                  <span className="text-primary/40 w-20 shrink-0 font-semibold">
                    Size:
                  </span>
                  <span className="text-primary/80 font-medium break-words min-w-0 flex-1">
                    {orderData.details.size}
                  </span>
                </div>
              )}
              {orderData.details?.flavor && (
                <div className="flex gap-2">
                  <span className="text-primary/40 w-20 shrink-0 font-semibold">
                    Flavor:
                  </span>
                  <span className="text-primary/80 font-medium break-words min-w-0 flex-1">
                    {orderData.details.flavor}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-primary/40 w-20 shrink-0 font-semibold">
                  Inscription:
                </span>
                {orderData.details?.textOnCake?.trim() ? (
                  <span className="text-primary/80 font-serif italic break-words whitespace-pre-wrap min-w-0 flex-1">
                    "{orderData.details.textOnCake}"
                  </span>
                ) : (
                  <span className="text-primary/30 italic">None</span>
                )}
              </div>
              {orderData.allergies && orderData.allergies !== "No" && (
                <div className="flex gap-2 pt-1.5 mt-1.5 border-t border-primary/10">
                  <span className="text-primary/40 w-20 shrink-0 font-semibold">
                    Allergies:
                  </span>
                  <span className="text-rose-600/80 font-medium break-words min-w-0 flex-1">
                    {orderData.allergies}
                  </span>
                </div>
              )}
              {orderData.details?.designNotes && (
                <div className="flex gap-2 pt-1.5 mt-1.5 border-t border-primary/10">
                  <span className="text-primary/40 w-20 shrink-0 font-semibold">
                    Design:
                  </span>
                  <span className="text-primary/70 leading-relaxed break-words whitespace-pre-wrap min-w-0 flex-1">
                    {orderData.details.designNotes}
                  </span>
                </div>
              )}
            </div>

            {/* Reference Images */}
            {orderData.referenceImages.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mb-2">
                  Reference Images ({orderData.referenceImages.length})
                </p>
                <div className="flex gap-2 overflow-hidden">
                  {orderData.referenceImages.map((img, i) => {
                    const cbImg = img.includes("?")
                      ? `${img}&_cb=${i}`
                      : `${img}?_cb=${i}`;
                    return (
                      <div
                        key={i}
                        className="w-14 h-14 rounded-lg border border-primary/10 shadow-sm shrink-0 bg-primary/5 overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cbImg}
                          alt="Ref"
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Price Breakdown ────────────────────────────────────────── */}
          <div className="bg-primary/5 border-t border-primary/10 px-6 py-5 mt-auto">
            <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Price Breakdown
            </h3>

            <div className="space-y-2">
              {/* 1. Base Cake Size */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary/70 font-medium">
                  Base Cake
                  {orderData.details?.size ? (
                    <span className="text-primary/40 font-normal ml-1 text-xs">
                      ({orderData.details.size})
                    </span>
                  ) : null}
                </span>
                {grandTotal > 0 ? (
                  <span className="font-semibold text-primary/80 tabular-nums">
                    ${baseCakePrice.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-xs italic text-amber-600 font-semibold">
                    TBD
                  </span>
                )}
              </div>

              {/* 2. Flavor Upcharge — only shown when premium flavor adds cost */}
              {flavorUpcharge > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-primary/60 font-medium">
                    Flavor
                    {flavorName && (
                      <span className="text-primary/40 font-normal">
                        {" "}
                        · {flavorName}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-primary/70 tabular-nums">
                    +${flavorUpcharge.toFixed(2)}
                  </span>
                </div>
              )}

              {/* 3. Addon lines — one row per selected addon */}
              {addons.length > 0 && (
                <>
                  <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest pt-1">
                    Add-ons
                  </p>
                  {addons.map((addon, idx) => (
                    <div
                      key={`${addon.addonId}-${idx}`}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-primary/60 font-medium">
                        {addon.name}
                        {addon.variantName && (
                          <span className="text-primary/40 font-normal">
                            {" "}
                            · {addon.variantName}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-primary/70 tabular-nums">
                        {addon.price > 0 ? (
                          `+$${addon.price.toFixed(2)}`
                        ) : (
                          <span className="italic text-primary/30">Free</span>
                        )}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* Disclaimer */}
              <p className="text-[12px] text-primary font-bold text-center leading-relaxed pt-2">
                Please note: Design requests are subject to final review.
                Additional charges may apply based on the complexity of your
                reference images and instructions
              </p>
              <p className="text-[12px] text-primary/30 font-medium text-center leading-relaxed pt-2">
                Estimate only — final price confirmed by baker after review.
              </p>
            </div>

            {/* Grand Total — exact HTML required by spec */}
            <div className="flex justify-between items-center mt-3 pt-4 border-t border-gray-300 border-dashed">
              <span className="font-extrabold text-lg text-primary/40">
                Est. Total
              </span>
              <span className="font-extrabold text-xl text-amber-600 italic">
                {hasPricing
                  ? `$${grandTotal.toFixed(2)}`
                  : orderData.approximatePrice
                    ? `$${orderData.approximatePrice.toFixed(2)}`
                    : "TBD"}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-6 text-center bg-gray-50 text-xs font-medium text-primary/40 border-t border-gray-200">
            <p className="mb-1 text-primary/50 font-semibold">
              Thank you for your custom request! 💖
            </p>
            <p>
              {process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE
                ? `@${process.env.NEXT_PUBLIC_BAKERY_DM_HANDLE.replace(/^@+/, "")}`
                : "@D&KCreations"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
