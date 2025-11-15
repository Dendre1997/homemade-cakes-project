"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/store/cartStore";

const OrderSummary = () => {
  const { items } = useCartStore();
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="rounded-medium bg-card-background p-lg shadow-md">
      <h2 className="font-heading text-h3 text-primary">Order Summary</h2>
      <ul role="list" className="mt-md divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center py-md">
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={64}
              height={64}
              className="h-16 w-16 rounded-medium object-cover"
            />
            <div className="ml-md flex-1">
              <p className="font-body font-bold">{item.name}</p>
              <p className="text-small text-primary/80">
                {item.quantity} x ${item.price.toFixed(2)}
              </p>
            </div>
            <p className="font-body font-semibold">
              ${(item.price * item.quantity).toFixed(2)}
            </p>
          </li>
        ))}
      </ul>
      <dl className="mt-lg space-y-md border-t border-border pt-lg font-body text-body">
        <div className="flex items-center justify-between">
          <dt>Subtotal</dt>
          <dd className="font-semibold">${subtotal.toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Shipping</dt>
          <dd className="text-primary/80">TBD</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-md mt-md">
          <dt className="font-bold text-lg">Total</dt>
          <dd className="font-bold text-lg">${subtotal.toFixed(2)}</dd>
        </div>
      </dl>
    </div>
  );
};

export default OrderSummary;
