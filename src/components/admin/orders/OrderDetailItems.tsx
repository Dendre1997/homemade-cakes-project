"use client";

import Image from "next/image";
import { Order, Diameter } from "@/types";

interface OrderDetailItemsProps {
  items: Order["items"];
  diameters: Diameter[];
  totalAmount: number;
}

const OrderDetailItems = ({
  items,
  diameters,
  totalAmount,
}: OrderDetailItemsProps) => {
  return (
    <div className="bg-card-background p-lg rounded-large shadow-md">
      <h2 className="font-heading text-h3 text-primary mb-md">Items</h2>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const diameter = diameters.find(
            (d) => d._id.toString() === item.diameterId.toString()
          );
          return (
            <li
              key={item.id || item.productId.toString()}
              className="py-md flex"
            >
              <Image
                src={item.imageUrl || "/placeholder.png"}
                alt={item.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-medium object-cover border border-border"
              />
              <div className="ml-md flex-grow">
                <p className="font-body font-bold text-primary">{item.name}</p>
                <p className="font-body text-small text-primary/80">
                  {item.flavor}
                </p>
                {diameter && (
                  <p className="font-body text-small text-primary/80">
                    {diameter.name}
                  </p>
                )}
                <p className="font-body text-small text-primary/80">
                  Qty: {item.quantity}
                </p>
              </div>
              <p className="ml-auto font-body font-semibold text-primary">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-md pt-md border-t border-border text-right">
        <p className="font-body text-lg font-bold text-primary">
          Total: ${totalAmount.toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default OrderDetailItems;
