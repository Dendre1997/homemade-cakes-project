"use client";

import { useCartStore } from "@/lib/store/cartStore";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/Spinner";
import { Diameter, Flavor } from "@/types";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import QuantityStepper from "@/components/ui/QuantityStepper";

const CartPage = () => {
  const { items, removeItem, increaseQuantity, decreaseQuantity } = useCartStore();
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  // This state is used to prevent hydration mismatches with the client side cart
  const [isMounted, setIsMounted] = useState(false);

  // Fetch all available diameters to map diameter Id from cart to display names
  const fetchDiameters = async () => {
    try {
      const res = await fetch("/api/diameters");
      if (res.ok) {
        setDiameters(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch diameters", error);
    }
  };

  const fetchFlavors = async () => {
      try {
          const res = await fetch("/api/flavors");
          if (res.ok) {
              setFlavors(await res.json());
          }
      } catch (error) {
          console.error("Failed to fetch flavors", error);
      }
  }

  useEffect(() => {
    setIsMounted(true);
    fetchDiameters();
    fetchFlavors();
  }, []);

  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  if (!isMounted) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-lg py-xl">
        <h1 className="font-heading text-h1 text-center text-primary">Your Cart</h1>

        {items.length === 0 ? (
          //  Empty State 
          <div className="py-xxl text-center">
            <p className="font-body text-lg text-primary">
              Your cart is currently empty.
            </p>
            <div className="mt-lg">
              <Link href="/products">
                <Button variant="secondary">Return to Catalog</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-lg grid grid-cols-1 gap-xl lg:grid-cols-3">
            <section className="lg:col-span-2">
              <ul role="list" className="space-y-lg">
                {items.map((item) => {
                  // Safe Diameter Lookup (Only for Standard Cakes)
                  const diameter = item.diameterId 
                    ? diameters.find(d => d._id.toString() === item.diameterId!.toString())
                    : null;

                  // Main Flavor Lookup (Standard Cakes)
                  const standardFlavor = item.flavorId
                    ? flavors.find(f => f._id.toString() === item.flavorId!.toString())
                    : null;

                  //  Combo Cake Flavor Lookup
                  const comboCakeFlavor = item.selectedConfig?.cake?.flavorId
                    ? flavors.find(f => f._id.toString() === item.selectedConfig!.cake!.flavorId.toString())
                    : null;

                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-md border-b border-border pb-lg sm:flex-row"
                    >
                      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-medium">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="ml-0 mt-md flex flex-1 flex-col justify-between sm:ml-md sm:mt-0">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-heading text-h3 text-primary">
                              {item.name}
                            </h3>
                            
                            {/* SCENARIO A: Standard Cake Details */}
                            {!item.selectedConfig && (
                                <>
                                    <p className="mt-sm font-body text-body text-primary/80">
                                      {item.flavor || standardFlavor?.name} {standardFlavor && standardFlavor.price > 0 ? `(+${standardFlavor.price})` : ''}
                                    </p>
                                    {diameter && (
                                      <p className="font-body text-body text-primary/80">
                                        {diameter.name} ({diameter.sizeValue}")
                                      </p>
                                    )}
                                </>
                            )}
                            
                            {/* SCENARIO B: Set / Combo Details */}
                            {item.selectedConfig && (
                                 <div className="mt-2 text-sm text-primary/90">
                                    <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                       Set Configuration
                                    </p>

                                    {/* If it is a COMBO (Has Cake) */}
                                    {item.selectedConfig.cake && comboCakeFlavor && (
                                      <div className="mb-2 p-2 bg-subtleBackground/50 rounded text-xs border border-primary/10">
                                         <p className="font-bold flex items-center gap-1">
                                            <span>🎂 Bento Cake</span>
                                         </p>
                                         <div className="pl-1 mt-1 space-y-0.5">
                                             <p>
                                                <span className="font-medium">Flavor:</span> {comboCakeFlavor.name} 
                                                {/* SHOW EXTRA CHARGE HERE */}
                                                {comboCakeFlavor.price > 0 && <span className="text-primary font-bold ml-1">(+${comboCakeFlavor.price})</span>}
                                             </p>
                                             <p><span className="font-medium">Size:</span> 4 inches (Standard)</p>
                                             {item.selectedConfig.cake.inscription && (
                                                <p className="italic text-muted-foreground mt-1 border-l-2 border-primary/30 pl-2">"{item.selectedConfig.cake.inscription}"</p>
                                             )}
                                         </div>
                                      </div>
                                    )}

                                    {/* Treats List (Cupcakes/Macarons) */}
                                    {item.selectedConfig.items && item.selectedConfig.items.length > 0 && (
                                       <div className="mt-1">
                                          <p className="font-bold text-xs">Treats:</p>
                                          <ul className="list-disc list-inside pl-1 mt-0.5 space-y-0.5">
                                            {item.selectedConfig.items.map((subItem, idx) => {
                                               const subFlavor = flavors.find(f => f._id === subItem.flavorId);
                                               return (
                                                 <li key={idx}>
                                                   {subFlavor?.name || 'Unknown Flavor'} {subItem.count > 1 ? `(x${subItem.count})` : ''}
                                                 </li>
                                               )
                                            })}
                                          </ul>
                                       </div>
                                    )}
                                 </div>
                            )}

                          </div>
                          <div className="text-right">
                            {item.originalPrice ? (
                              <>
                                <p className="font-body text-body text-gray-400 line-through">
                                  ${(item.originalPrice * item.quantity).toFixed(2)}
                                </p>
                                <p className="font-body text-lg font-semibold text-error">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </p>
                                {item.discountName && (
                                  <p className="text-xs text-error font-medium">{item.discountName}</p>
                                )}
                              </>
                            ) : (
                                <p className="font-body text-lg font-semibold text-primary">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-md flex items-center justify-between">
                          {/* Quantity Selector */}
                          <QuantityStepper
                            quantity={item.quantity}
                            onIncrease={() => increaseQuantity(item.id)}
                            onDecrease={() => decreaseQuantity(item.id)}
                          />

                          {/* Remove Button */}
                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-sm" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* --- Order Summary --- */}
            <section className="lg:col-span-1">
              <div className="rounded-medium bg-card-background p-lg shadow-md">
                <h2 className="font-heading text-h3 text-primary">
                  Order Summary
                </h2>
                <dl className="mt-lg space-y-md font-body text-body">
                  <div className="flex items-center justify-between">
                    <dt>Subtotal</dt>
                    <dd className="font-semibold">
                      ${subtotal.toFixed(2)} CAD
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Shipping</dt>
                    <dd className="text-primary/80">Calculated at next step</dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-md mt-md">
                    <dt className="font-bold text-lg">Total</dt>
                    <dd className="font-bold text-lg">
                      ${subtotal.toFixed(2)} CAD
                    </dd>
                  </div>
                </dl>
                <div className="mt-lg">
                  <Link href="/checkout">
                    <Button variant="primary" className="w-full">
                      Proceed to Checkout
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
