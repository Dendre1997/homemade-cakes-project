"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";
import { Order } from "@/types";
import Image from "next/image";
import { Tag } from "lucide-react"; // Tag icon for discount

const ThankYouPage = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error("Could not find your order.");

        const data = await res.json();
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-lg text-center">
        <h1 className="font-heading text-h2 text-error">
          Something went wrong
        </h1>
        <p className="mt-md font-body text-lg text-primary/80">
          {error || "We couldn't load your order details."}
        </p>
        <div className="mt-xl">
          <Link href="/">
            <Button variant="secondary">Return to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  const discountAmount = order.discountInfo?.amount || 0;
  // Reverse engineer subtotal: Final + Discount = Original Subtotal
  const subtotal = order.totalAmount + discountAmount;

  return (
    <div className="flex min-h-screen justify-center bg-background py-xl">
      <div className="mx-auto max-w-2xl w-full p-lg text-center">
        <h1 className="font-heading text-h1 text-primary">
          Thank you for your order!
        </h1>
        <div className="flex justify-center my-md">
          <Image
            alt="Thank you illustration"
            src="/ThankYouImage.png"
            width={300}
            height={212}
            quality={100}
            priority
            className="object-contain"
          />
        </div>
        <p className="mt-md font-body text-lg text-primary/80">
          We`ve received your order and will contact you shortly to confirm the
          details.
        </p>

        <div className="mt-lg rounded-medium border border-border bg-card-background p-md text-left shadow-sm">
          <div className="flex justify-between items-center mb-md border-b border-border pb-sm">
            <h3 className="font-body font-bold text-primary text-lg">
              Order #{order._id.toString().slice(-6).toUpperCase()}
            </h3>
            <span className="text-xs text-primary/60">
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>

          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="py-sm flex items-center justify-between font-body"
              >
                <div className="flex items-center gap-md">
                  {/* Item Thumbnail */}
                  <div className="relative h-12 w-12 rounded-small overflow-hidden border border-border bg-neutral-100 flex-shrink-0">
                    <Image
                      src={item.imageUrl || "/placeholder.png"}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-primary">
                      {item.name}{" "}
                      <span className="text-primary/60 text-xs">
                        x{item.quantity}
                      </span>
                    </span>
                    <span className="text-xs text-primary/70">
                      {item.flavor}
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-primary">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-md pt-md border-t border-border space-y-sm">
            {/* Subtotal Row */}
            <div className="flex justify-between text-primary/80 text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {/* --- 2. Discount Row --- */}
            {discountAmount > 0 && (
              <div className="flex justify-between text-accent font-medium text-sm">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Discount{" "}
                  {order.discountInfo?.name && `(${order.discountInfo.name})`}
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            {/* Total Row */}
            <div className="flex justify-between border-t border-border pt-sm text-lg font-bold text-primary">
              <span>Total</span>
              <span>${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-xl">
          <Link href="/">
            <Button variant="secondary">Return to Homepage</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
