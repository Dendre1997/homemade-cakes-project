"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cartStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Tag } from "lucide-react";

// Types for the pricing data we get from the server
interface ItemBreakdown {
  itemId: string;
  originalPrice: number;
  finalPrice: number;
  discountName: string | null;
}

const OrderSummary = () => {
  const { items, discountTotal, setDiscount, discountCode } = useCartStore();

  const [promoCode, setPromoCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Store per-item pricing data from the server
  const [itemPricing, setItemPricing] = useState<Record<string, ItemBreakdown>>(
    {}
  );
  const [flavors, setFlavors] = useState<any[]>([]);

  useEffect(() => {
     const fetchFlavors = async () => {
         try {
             const res = await fetch("/api/flavors");
             if (res.ok) setFlavors(await res.json());
         } catch(e) {
             console.error("Failed to fetch flavors", e);
         }
     }
     fetchFlavors();
  }, [])

  // Basic client-side subtotal (for initial render)
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Function to call the calculation API
  const calculateTotal = async (code?: string) => {
    setIsApplying(true);
    setMessage(null);
    try {
      const res = await fetch("/api/checkout/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, promoCode: code }),
      });

      const data = await res.json();

      if (data.error) {
        setMessage({ text: data.error, type: "error" });
        // If the code failed, we clear the global discount state
        setDiscount(0, null, null);
        setItemPricing({});
      } else {
        // Update global store with totals
        setDiscount(data.discountTotal, data.appliedCode, data.appliedDiscount);

        // Update local state with item breakdown
        if (data.itemBreakdown && Array.isArray(data.itemBreakdown)) {
          const map: Record<string, ItemBreakdown> = {};
          data.itemBreakdown.forEach((p: ItemBreakdown) => {
            map[p.itemId] = p;
          });
          setItemPricing(map);
        }

        // Success messages
        if (data.appliedCode) {
          setMessage({
            text: `Code "${data.appliedCode}" applied!`,
            type: "success",
          });
        } else if (data.discountTotal > 0) {
          setMessage({ text: "Automatic discount applied!", type: "success" });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsApplying(false);
    }
  };

  //  Check discounts on mount or when cart changes
  useEffect(() => {
    if (items.length > 0) {
      // Use existing code from store if available, otherwise check auto discounts
      calculateTotal(discountCode || undefined);
    }
  }, [items]);

  //  Fix: Prevent form submission on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Stop parent form submit
      handleApplyCode();
    }
  };

  const handleApplyCode = () => {
    if (!promoCode.trim()) return;
    calculateTotal(promoCode);
  };



  const total =
    Object.keys(itemPricing).length > 0
      ? items.reduce((acc: number, item: any) => {
          // If server data exists for this item, use it. Otherwise, use base price.
          const pricing = itemPricing[item.id];
          const price = pricing
            ? pricing.finalPrice
            : item.price * item.quantity;
          return acc + price;
        }, 0)
      : Math.max(0, subtotal - discountTotal);

  return (
    <div className="rounded-medium bg-card-background p-lg shadow-md">
      <h2 className="font-heading text-h3 text-primary">Order Summary</h2>
      <ul role="list" className="mt-md divide-y divide-border">
        {items.map((item) => {
          // Check if we have discount info for this item
          const pricing = itemPricing[item.id];
          const hasItemDiscount =
            pricing && pricing.finalPrice < pricing.originalPrice;

          // Lookups for Combo Visualization
          const comboCakeFlavor = item.selectedConfig?.cake?.flavorId 
             ? flavors.find(f => f._id.toString() === item.selectedConfig!.cake!.flavorId) 
             : null;

          return (
            <li key={item.id} className="flex flex-col py-md gap-2">
              <div className="flex items-center">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-medium border border-border">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="ml-md flex-1">
                    <p className="font-body font-bold text-primary">{item.name}</p>
                    
                    {/* SCENARIO A: Standard Cake Details */}
                    {!item.selectedConfig && (
                         <div className="text-small text-primary/80">
                            <p>{item.quantity} x ${item.price.toFixed(2)}</p>
                            {item.flavor && <p className="text-xs text-muted-foreground">{item.flavor}</p>}
                         </div>
                    )}

                    {/* SCENARIO B: Set / Combo Details */}
                    {item.selectedConfig && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                           
                           {/* 1. Box Size (If we can map quantityConfigId to a label, or just show generic text) */}
                           <p className="font-semibold text-[10px] bg-primary/5 inline-block px-1 rounded text-primary">Set Configuration</p>
    
                           {/* 2. Bento Details (For Combos) */}
                           {item.selectedConfig.cake && (
                             <div className="pl-2 border-l-2 border-primary/20">
                               <p className="font-medium text-[10px]">Bento Cake:</p>
                               {comboCakeFlavor ? (
                                    <span>
                                      {comboCakeFlavor.name} 
                                      {comboCakeFlavor.price > 0 && <span className="text-primary ml-1">(+${comboCakeFlavor.price})</span>}
                                    </span>
                                  ) : (
                                    <span>Standard Flavor</span>
                                  )
                               }
                               {item.selectedConfig.cake.inscription && (
                                 <p className="italic text-[10px] text-gray-400">"{item.selectedConfig.cake.inscription}"</p>
                               )}
                             </div>
                           )}
    
                           {/* 3. Treats List */}
                           {item.selectedConfig.items && item.selectedConfig.items.length > 0 && (
                             <div className="pl-2">
                               <p className="font-medium text-[10px]">Treats:</p>
                               <ul className="list-disc list-inside text-[10px] space-y-0.5">
                                 {item.selectedConfig.items.map((sub, i) => {
                                    const subFlavor = flavors.find(f => f._id === sub.flavorId);
                                    return <li key={i}>{subFlavor?.name || "Flavor"} {sub.count > 1 && `(x${sub.count})`}</li>
                                 })}
                               </ul>
                             </div>
                           )}
                           
                           <p className="text-xs mt-1 font-medium">{item.quantity} x ${item.price.toFixed(2)}</p>
                        </div>
                    )}

                  </div>
    
                  {/* --- ITEM PRICE COLUMN --- */}
                  <div className="text-right self-start ml-2">
                    {hasItemDiscount ? (
                      <div className="flex flex-col items-end">
                        {/* Original Price */}
                        <span className="text-xs text-primary/60 line-through">
                          ${pricing.originalPrice.toFixed(2)}
                        </span>
                        {/* Discounted Price */}
                        <span className="font-body font-semibold text-accent">
                          ${pricing.finalPrice.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <p className="font-body font-semibold text-primary">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* --- PROMO CODE SECTION --- */}
      <div className="mt-lg pt-md border-t border-border">
        <label
          htmlFor="promo"
          className="text-small font-bold text-primary mb-2 block"
        >
          Have a promo code?
        </label>
        <div className="flex gap-2">
          <Input
            id="promo"
            placeholder="Enter code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-white"
          />
          <Button
            type="button" // CRITICAL: Prevents page reload/form submit
            variant="secondary"
            disabled={isApplying || !promoCode}
            onClick={handleApplyCode}
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>
        {message && (
          <p
            className={`text-xs mt-2 ${message.type === "error" ? "text-error" : "text-success"}`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* --- TOTALS SECTION --- */}
      <dl className="mt-md space-y-md border-t border-border pt-lg font-body text-body">
        <div className="flex items-center justify-between text-primary/80">
          <dt>Subtotal</dt>
          <dd>${subtotal.toFixed(2)}</dd>
        </div>

        {/* Global Discount Row */}
        {discountTotal > 0 && (
          <div className="flex items-center justify-between text-accent font-medium">
            <dt className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              Total Savings
              {useCartStore.getState().discountName && (
                <span className="text-xs ml-1">
                  ({useCartStore.getState().discountName})
                </span>
              )}
            </dt>
            <dd>-${discountTotal.toFixed(2)}</dd>
          </div>
        )}

        <div className="flex items-center justify-between">
          <dt className="text-primary/80">Shipping</dt>
          <dd className="text-primary/80">TBD</dd>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-md mt-md">
          <dt className="font-bold text-lg text-primary">Total</dt>
          <dd className="font-bold text-lg text-primary">
            ${total.toFixed(2)}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default OrderSummary;
