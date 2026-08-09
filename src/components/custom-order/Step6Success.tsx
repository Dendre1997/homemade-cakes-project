import { CustomOrderRequestData } from "@/lib/validation/customOrderSchema";
import { Info, Sparkles, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";
import HeaderLogo from "@/components/ui/HeaderLogo";
import { SocialHandleAnchor } from "@/components/ui/SocialHandleAnchor";
import { OrderItemTiersDisplay } from "@/components/shared/OrderItemTiersDisplay";
import { Button } from "@/components/ui/Button"

interface Step6Props {
  orderData: CustomOrderRequestData | null;
  /** custom_orders document id from POST response */
  customOrderId?: string | null;
  onMakeAnotherRequest: () => void;
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

/** Per-item specification + price breakdown card, rendered once per items[] entry. */
function ItemSummary({ item, index, total }: { item: any; index: number; total: number }) {
  const details = item?.details ?? {};
  const addons: any[] = item?.addons ?? [];
  const pb = item?.priceBreakdown;
  const grandTotal = pb?.grandTotal ?? item?.approximatePrice ?? 0;
  const baseCakePrice = pb?.baseCakePrice ?? 0;
  const flavorUpcharge = pb?.flavorUpcharge ?? 0;
  const flavorName = details?.flavor ?? "";
  const referenceImages: string[] = item?.referenceImages ?? [];

  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <h3 className="text-primary/40 text-xs uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        {total > 1 ? `Item ${index + 1} of ${total}` : "Specifications"}
      </h3>

      <div className="flex justify-between items-center mb-2">
        <p className="font-extrabold text-sm text-primary/80">{item?.category}</p>
        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wide">
          Custom
        </span>
      </div>

      <div className="text-xs text-primary/60 space-y-1.5 bg-primary/5 p-3 rounded-xl border border-primary/10">
        {details?.size && (
          <div className="flex gap-2">
            <span className="text-primary/40 w-20 shrink-0 font-semibold">Size:</span>
            <span className="text-primary/80 font-medium break-words min-w-0 flex-1">
              {details.size}
            </span>
          </div>
        )}
        {details?.shape && (
          <div className="flex gap-2">
            <span className="text-primary/40 w-20 shrink-0 font-semibold">Shape:</span>
            <span className="text-primary/80 font-medium break-words min-w-0 flex-1">
              {details.shape}
            </span>
          </div>
        )}
        {(details?.tiers?.length || details?.flavor) && (
          <div className="flex gap-2">
            <span className="text-primary/40 w-20 shrink-0 font-semibold">Flavor:</span>
            <div className="text-primary/80 font-medium break-words min-w-0 flex-1">
              <OrderItemTiersDisplay
                tiers={details?.tiers}
                flavor={details?.flavor}
                variant="compact"
                className="text-primary/80"
              />
            </div>
          </div>
        )}
        {details?.flavorNote && details.flavorNote !== "No" && (
          <div className="flex gap-2 pt-1.5 mt-1.5 border-t border-primary/10">
            <span className="text-primary/40 w-20 shrink-0 font-semibold">Flavor Note:</span>
            <span className="text-primary/80 font-medium break-words min-w-0 flex-1">
              {details.flavorNote}
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <span className="text-primary/40 w-20 shrink-0 font-semibold">Inscription:</span>
          {details?.textOnCake?.trim() ? (
            <span className="text-primary/80 font-serif italic break-words whitespace-pre-wrap min-w-0 flex-1">
              "{details.textOnCake}"
            </span>
          ) : (
            <span className="text-primary/30 italic">None</span>
          )}
        </div>
        {details?.designNotes && (
          <div className="flex gap-2 pt-1.5 mt-1.5 border-t border-primary/10">
            <span className="text-primary/40 w-20 shrink-0 font-semibold">Design:</span>
            <span className="text-primary/70 leading-relaxed break-words whitespace-pre-wrap min-w-0 flex-1">
              {details.designNotes}
            </span>
          </div>
        )}
      </div>

      {/* Reference Images */}
      {referenceImages.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mb-2">
            Reference Images ({referenceImages.length})
          </p>
          <div className="flex gap-2 overflow-hidden">
            {referenceImages.map((img, i) => {
              const cbImg = img.includes("?") ? `${img}&_cb=${i}` : `${img}?_cb=${i}`;
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

      {/* Per-item price lines */}
      <div className="mt-3 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-primary/70 font-medium">
            Base
            {details?.size ? (
              <span className="text-primary/40 font-normal ml-1 text-xs">
                ({details.size})
              </span>
            ) : null}
          </span>
          {grandTotal > 0 ? (
            <span className="font-semibold text-primary/80 tabular-nums">
              ${baseCakePrice.toFixed(2)}
            </span>
          ) : (
            <span className="text-xs italic text-amber-600 font-semibold">TBD</span>
          )}
        </div>

        {flavorUpcharge > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-primary/60 font-medium">
              Flavor
              {flavorName && (
                <span className="text-primary/40 font-normal"> · {flavorName}</span>
              )}
            </span>
            <span className="font-semibold text-primary/70 tabular-nums">
              +${flavorUpcharge.toFixed(2)}
            </span>
          </div>
        )}

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
                    <span className="text-primary/40 font-normal"> · {addon.variantName}</span>
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

        {total > 1 && grandTotal > 0 && (
          <div className="flex justify-between items-center text-sm pt-1.5 mt-1.5 border-t border-primary/10">
            <span className="text-primary/70 font-semibold">Item subtotal</span>
            <span className="font-bold text-primary/80 tabular-nums">
              ${grandTotal.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Step6Success({ orderData, customOrderId, onMakeAnotherRequest }: Step6Props) {

  if (!orderData) return null;

  const { name, socialNickname, socialPlatform } = orderData.contact;
  const hasSocialPlatform = !!socialPlatform;

  const items = orderData.items ?? [];

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

  // Aggregate estimate across every item
  const grandEstimate = items.reduce((sum, it: any) => {
    const itemTotal = it?.priceBreakdown?.grandTotal ?? it?.approximatePrice ?? 0;
    return sum + (Number(itemTotal) || 0);
  }, 0);
  const hasPricing = grandEstimate > 0;

  const paymentPreference = orderData.paymentPreference ?? "e-transfer";
  const paymentReminder =
    paymentPreference === "cash"
      ? "Payment: You selected Cash. You will pay the total amount upon pickup/delivery once your design is approved and priced."
      : "Payment: You selected E-transfer. Once your design is approved and priced, we will email you the final amount and the e-transfer email address. Payment is required the day before pickup.";

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-heading font-bold text-primary mb-2">
        Request Received!
      </h2>
      <p className="text-primary/70 mb-8 max-w-md text-center">
        Thank you, {displayName}! We will review your custom request and contact
        you {contactMethod} with a price quote.
      </p>

      <div
        role="status"
        className="mb-8 w-full max-w-lg rounded-2xl border border-primary/10 bg-white p-6 shadow-lg shadow-primary/5"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
            <DollarSign className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/50">
              What happens next
            </p>
            <p className="text-sm leading-relaxed text-primary/80">
              {paymentReminder}
            </p>
          </div>
        </div>
      </div>

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
                    <div className="mb-4 p-3 bg-accent/5 rounded-lg border border-accent/20 text-sm text-primary/80 flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                                  <div>
                                    <span className="font-semibold block mb-0.5">Pickup Location:</span>
                                    Calgary (East Village area)
                                  </div>
                                </div>
                  
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

            {/* Allergies — order-level */}
            {orderData.allergies && orderData.allergies !== "No" && (
              <div className="mt-3 flex gap-2 text-xs bg-rose-50/70 border border-rose-100 p-3 rounded-xl">
                <span className="text-primary/40 w-20 shrink-0 font-semibold">
                  Allergies:
                </span>
                <span className="text-rose-600/80 font-medium break-words min-w-0 flex-1">
                  {orderData.allergies}
                </span>
              </div>
            )}
          </div>

          {/* ── Per-item Specifications ─────────────────────────────────── */}
          {items.map((item: any, index: number) => (
            <ItemSummary
              key={item?.id ?? index}
              item={item}
              index={index}
              total={items.length}
            />
          ))}

          {/* ── Grand Total ─────────────────────────────────────────────── */}
          <div className="bg-primary/5 border-t border-primary/10 px-6 py-5 mt-auto">
            <p className="text-[12px] text-primary font-bold text-center leading-relaxed pt-1">
              Please note: Design requests are subject to final review.
              Additional charges may apply based on the complexity of your
              reference images and instructions
            </p>
            <p className="text-[12px] text-primary/30 font-medium text-center leading-relaxed pt-2 pb-3">
              Estimate only — final price confirmed by baker after review.
            </p>

            <div className="flex justify-between items-center mt-1 pt-4 border-t border-gray-300 border-dashed">
              <span className="font-extrabold text-lg text-primary/40">
                Est. Total
              </span>
              <span className="font-extrabold text-xl text-amber-600 italic">
                {hasPricing ? `$${grandEstimate.toFixed(2)}` : "TBD"}
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

    {/* Make Another Request Button */}
    <div className="mt-8 mb-4">
      <Button
        type="button"
        onClick={onMakeAnotherRequest}
        className="h-11 px-6 rounded-xl border border-primary/20 bg-white hover:bg-primary/5 text-primary font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
      >
        Make Another Request
      </Button>
    </div>
  </div>
  );
}
