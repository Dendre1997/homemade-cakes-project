"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/Spinner";
import { Order } from "@/types";
import Image from "next/image";


interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  flavor: string;
}

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

  return (
    <div className="flex min-h-screen  justify-center bg-background">
      <div className="mx-auto max-w-2xl p-lg text-center">
        <h1 className="font-heading text-h1 text-primary">
          Thank you for your order!
        </h1>
        <div className="flex justify-center">
          <Image
            alt="logo-main"
            src="/ThankYouImage.png"
            width={300}
            height={212}
            quality={100}
          />
        </div>
        <p className="mt-md font-body text-lg text-primary/80">
          We`ve received your order and will contact you shortly to confirm the
          details.
        </p>

        <div className="mt-lg rounded-medium border border-border bg-card-background p-md text-left">
          <h3 className="font-body font-bold text-primary">
            Order #{order._id.toString().slice(-6).toUpperCase()}
          </h3>
          <ul className="mt-md divide-y divide-border">
            {order.items.map((item: OrderItem) => (
              <li
                key={item.id}
                className="py-sm flex items-center justify-between font-body"
              >
                <span>
                  {item.name} (x{item.quantity})
                </span>
                <span>{item.flavor}</span>
                <span className="font-semibold">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-md flex justify-between border-t border-border pt-md text-lg font-bold">
            <span>Total</span>
            <span>${order.totalAmount.toFixed(2)}</span>
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
