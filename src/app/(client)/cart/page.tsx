"use client";

import { useCartStore } from "@/lib/store/cartStore";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/Spinner";
import { Diameter } from "@/types";
import { Button } from "@/components/ui/Button";
import { Trash2, Plus, Minus } from "lucide-react";
import QuantityStepper from "@/components/ui/QuantityStepper";
const CartPage = () => {
  const { items, removeItem, increaseQuantity, decreaseQuantity } = useCartStore();
  const [diameters, setDiameters] = useState<Diameter[]>([]);
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
  useEffect(() => {
    setIsMounted(true);
    fetchDiameters();
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
          // --- 3. Empty State ---
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
                  const diameter = diameters.find(
                    (d) => d._id.toString() === item.diameterId.toString()
                  );
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
                            <p className="mt-sm font-body text-body text-primary/80">
                              {item.flavor}
                            </p>
                            {diameter && (
                              <p className="font-body text-body text-primary/80">
                                {diameter.name}
                              </p>
                            )}
                          </div>
                          <p className="font-body text-lg font-semibold text-primary">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
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

            {/* --- Right Column: Order Summary --- */}
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
