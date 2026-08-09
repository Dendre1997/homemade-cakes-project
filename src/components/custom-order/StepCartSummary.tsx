import { useFormContext } from "react-hook-form";
import { CustomOrderRequestData } from "@/lib/validation/customOrderSchema";
import { Button } from "@/components/ui/Button";
import { OrderItemTiersDisplay } from "@/components/shared/OrderItemTiersDisplay";
import { Pencil, Trash2, PlusCircle, ArrowRight } from "lucide-react";
import Image from "next/image";

interface StepCartSummaryProps {
  onAddAnother: () => void;
  onEditItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onProceed: () => void;
}

/**
 * Cart Summary step. Lists every custom item the client has configured so far
 * and lets them add another item, edit/remove existing ones, or proceed to the
 * order-level Contact step.
 */
export default function StepCartSummary({
  onAddAnother,
  onEditItem,
  onRemoveItem,
  onProceed,
}: StepCartSummaryProps) {
  const { watch } = useFormContext<CustomOrderRequestData>();
  const items = watch("items") ?? [];

  const grandEstimate = items.reduce(
    (sum, it: any) => sum + (Number(it?.approximatePrice) || 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center">
        <p className="text-primary/70 mt-2">
          {items.length === 1
            ? "Your request includes 1 product."
            : `Your request includes ${items.length} products.`}
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item: any, index: number) => {
          const canRemove = items.length > 1;
          const firstImage = item?.referenceImages?.[0];
          const estimate = Number(item?.approximatePrice) || 0;

          return (
            <div
              key={item?.id ?? index}
              className="flex gap-4 items-start rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
            >
              {/* Thumbnail */}
              <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-primary/10 bg-subtleBackground">
                {firstImage ? (
                  <Image
                    src={firstImage}
                    alt={item?.category || "Custom product"}
                    fill
                    quality={80}
                    className="object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    🎂
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading font-bold text-primary truncate">
                    {item?.category || `Product ${index + 1}`}
                  </h3>
                  <span className="text-sm font-semibold text-accent tabular-nums shrink-0">
                    {estimate > 0 ? `~$${estimate.toFixed(2)}` : "Est. pending"}
                  </span>
                </div>

                {item?.details?.size && (
                  <p className="text-sm text-primary/70 truncate">
                    {item.details.size}
                  </p>
                )}

                <div className="text-sm text-primary/60 mt-0.5">
                  <OrderItemTiersDisplay
                    tiers={item?.details?.tiers}
                    flavor={item?.details?.flavor}
                    variant="compact"
                  />
                </div>

                {/* Row actions */}
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => onEditItem(index)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary/70 hover:text-primary transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-red-500/80 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Running estimate */}
      {grandEstimate > 0 && (
        <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary/50">
            Estimated Total
          </span>
          <span className="text-xl font-extrabold text-accent tabular-nums">
            ~${grandEstimate.toFixed(2)}
          </span>
        </div>
      )}

      {/* Add another item */}
      <button
        type="button"
        onClick={onAddAnother}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/20 py-4 text-primary/70 font-semibold hover:border-accent/50 hover:text-primary hover:bg-subtleBackground transition-all active:scale-[0.99]"
      >
        <PlusCircle className="w-5 h-5" /> Add Another Product
      </button>

      {/* Proceed */}
      <Button
        type="button"
        onClick={onProceed}
        className="w-full h-12 text-lg rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        Proceed to Contact Info <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
